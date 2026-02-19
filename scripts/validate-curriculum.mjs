#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import { loadYamlFile } from './lib/yaml-lite.mjs';
import { looksLikeHttpsUrl, validateTranslatable } from './lib/curriculum.mjs';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const yearMonthPattern = /^\d{4}-\d{2}$/;
const idPattern = /^[a-z0-9][a-z0-9._-]*$/;
const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;

function isDate(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isYearMonth(value) {
  if (typeof value !== 'string' || !yearMonthPattern.test(value)) return false;
  const [y, m] = value.split('-').map(Number);
  return y >= 1900 && y <= 2999 && m >= 1 && m <= 12;
}

function compareYearMonth(a, b) {
  return a.localeCompare(b);
}

function ensureId(item, fieldName, errors, seen) {
  if (!item || typeof item.id !== 'string' || !idPattern.test(item.id)) {
    errors.push(`${fieldName} id is required and must match ${idPattern}`);
    return;
  }
  if (seen.has(item.id)) {
    errors.push(`${fieldName} duplicate id '${item.id}' (first seen at ${seen.get(item.id)})`);
  } else {
    seen.set(item.id, fieldName);
  }
}

function ensureUrlOrLinkId(value, fieldName, errors, linkIds) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${fieldName} must be a non-empty string URL or link id`);
    return;
  }
  if (looksLikeHttpsUrl(value)) return;
  if (linkIds.has(value)) return;
  errors.push(`${fieldName} must be an https URL or an existing link id`);
}

function loadCurriculum(repoRoot) {
  const rootPath = path.join(repoRoot, 'curriculum/cv.yaml');
  if (!fs.existsSync(rootPath)) {
    throw new Error('Missing curriculum/cv.yaml');
  }
  return { rootPath, root: loadYamlFile(rootPath) };
}

export function validateCurriculum(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const errors = [];
  const warnings = [];
  const seenIds = new Map();

  const { root } = loadCurriculum(repoRoot);
  const enums = loadYamlFile(path.join(repoRoot, 'curriculum/_registry/enums.yaml'));

  const requiredRoot = ['id', 'schema_version', 'default_locale', 'supported_locales', 'profile_mode', 'updated', 'sections', 'exports'];
  for (const key of requiredRoot) {
    if (!(key in root)) errors.push(`curriculum/cv.yaml missing '${key}'`);
  }

  if (root.id && !idPattern.test(root.id)) errors.push("curriculum/cv.yaml: 'id' is invalid");
  if (root.updated && !isDate(root.updated)) errors.push("curriculum/cv.yaml: 'updated' must be YYYY-MM-DD");

  if (!Array.isArray(root.supported_locales)) {
    errors.push("curriculum/cv.yaml: 'supported_locales' must be an array");
  } else {
    if (!root.supported_locales.includes(root.default_locale)) {
      errors.push('curriculum/cv.yaml: default_locale must be in supported_locales');
    }
    if (!root.supported_locales.includes('pt-BR')) {
      errors.push("curriculum/cv.yaml: supported_locales must include 'pt-BR'");
    }
    for (const locale of root.supported_locales) {
      if (typeof locale !== 'string' || !localePattern.test(locale)) {
        errors.push(`curriculum/cv.yaml: invalid locale '${locale}' in supported_locales`);
      }
    }
  }

  if (!Array.isArray(enums.profile_mode) || !enums.profile_mode.includes(root.profile_mode)) {
    errors.push(`curriculum/cv.yaml: profile_mode '${root.profile_mode}' is invalid`);
  }

  if (typeof root.exports?.json_resume !== 'boolean') {
    errors.push("curriculum/cv.yaml: exports.json_resume must be a boolean");
  }
  if (root.exports?.json_resume) {
    if (typeof root.exports?.json_resume_path !== 'string' || !root.exports.json_resume_path.trim()) {
      errors.push("curriculum/cv.yaml: exports.json_resume_path must be a non-empty string when json_resume is true");
    }
  }

  const sectionKeys = ['profile', 'summary', 'experience', 'projects', 'education', 'skills', 'languages', 'links'];
  const sections = {};

  for (const key of sectionKeys) {
    const rel = root.sections?.[key];
    if (typeof rel !== 'string' || !rel.trim()) {
      errors.push(`curriculum/cv.yaml: sections.${key} is required`);
      continue;
    }
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) {
      errors.push(`curriculum/cv.yaml: sections.${key} path not found: ${rel}`);
      continue;
    }
    sections[key] = loadYamlFile(abs);
  }

  const linkIds = new Set();
  if (Array.isArray(sections.links?.links)) {
    for (const [idx, link] of sections.links.links.entries()) {
      const prefix = `links[${idx}]`;
      ensureId(link, prefix, errors, seenIds);
      if (link.id) linkIds.add(link.id);
      if (!Array.isArray(enums.link_kind) || !enums.link_kind.includes(link.kind)) {
        errors.push(`${prefix}.kind '${link.kind}' is invalid`);
      }
      if (!looksLikeHttpsUrl(link.url)) {
        errors.push(`${prefix}.url must be a valid https URL`);
      }
      validateTranslatable(link.label, `${prefix}.label`, errors, warnings);
      if (!['public', 'private'].includes(link.visibility)) {
        errors.push(`${prefix}.visibility must be public|private`);
      }
    }
  } else {
    errors.push('links.links must be an array');
  }

  if (sections.profile?.profile) {
    const profile = sections.profile.profile;
    ensureId(profile, 'profile', errors, seenIds);
    validateTranslatable(profile.name, 'profile.name', errors, warnings);
    validateTranslatable(profile.title, 'profile.title', errors, warnings);

    if (profile.location?.region != null) {
      validateTranslatable(profile.location.region, 'profile.location.region', errors, warnings);
    }

    if (profile.contact?.picture_url && !looksLikeHttpsUrl(profile.contact.picture_url)) {
      errors.push('profile.contact.picture_url must be an https URL');
    }

    if (typeof profile.contact?.email !== 'string' || !profile.contact.email.trim()) {
      errors.push('profile.contact.email is required');
    }

    if (!Array.isArray(profile.links)) {
      errors.push('profile.links must be an array');
    } else {
      for (const linkId of profile.links) {
        if (!linkIds.has(linkId)) {
          errors.push(`profile.links references unknown id '${linkId}'`);
        }
      }
    }

    if (!Array.isArray(profile.availability?.work_model)) {
      errors.push('profile.availability.work_model must be an array');
    } else {
      for (const wm of profile.availability.work_model) {
        if (!Array.isArray(enums.work_model) || !enums.work_model.includes(wm)) {
          errors.push(`profile.availability.work_model contains invalid value '${wm}'`);
        }
      }
    }
  }

  if (sections.summary?.summary) {
    const summary = sections.summary.summary;
    ensureId(summary, 'summary', errors, seenIds);
    validateTranslatable(summary.professional_summary, 'summary.professional_summary', errors, warnings);
    validateTranslatable(summary.objective, 'summary.objective', errors, warnings);
  }

  const projectIds = new Set();
  if (Array.isArray(sections.projects?.projects)) {
    for (const [idx, project] of sections.projects.projects.entries()) {
      const prefix = `projects[${idx}]`;
      ensureId(project, prefix, errors, seenIds);
      if (project.id) projectIds.add(project.id);
      validateTranslatable(project.name, `${prefix}.name`, errors, warnings);
      validateTranslatable(project.description, `${prefix}.description`, errors, warnings);
      if (!Array.isArray(project.links)) {
        errors.push(`${prefix}.links must be an array`);
      } else {
        for (const linkId of project.links) {
          if (!linkIds.has(linkId)) errors.push(`${prefix}.links references unknown id '${linkId}'`);
        }
      }
    }
  } else {
    errors.push('projects.projects must be an array');
  }

  const expIds = new Set();
  if (Array.isArray(sections.experience?.experience)) {
    for (const [idx, exp] of sections.experience.experience.entries()) {
      const prefix = `experience[${idx}]`;
      ensureId(exp, prefix, errors, seenIds);
      if (exp.id) expIds.add(exp.id);

      validateTranslatable(exp.company?.name, `${prefix}.company.name`, errors, warnings);
      ensureUrlOrLinkId(exp.company?.website, `${prefix}.company.website`, errors, linkIds);
      validateTranslatable(exp.role, `${prefix}.role`, errors, warnings);

      if (!isYearMonth(exp.start)) errors.push(`${prefix}.start must be YYYY-MM`);
      if (!(exp.end === 'present' || isYearMonth(exp.end))) errors.push(`${prefix}.end must be YYYY-MM or present`);
      if (isYearMonth(exp.start) && isYearMonth(exp.end) && compareYearMonth(exp.start, exp.end) > 0) {
        errors.push(`${prefix}: start must be <= end`);
      }

      if (Array.isArray(exp.related_links)) {
        for (const linkId of exp.related_links) {
          if (!linkIds.has(linkId)) errors.push(`${prefix}.related_links references unknown id '${linkId}'`);
        }
      }

      if (Array.isArray(exp.achievements)) {
        for (const [aIdx, ach] of exp.achievements.entries()) {
          validateTranslatable(ach, `${prefix}.achievements[${aIdx}]`, errors, warnings);
        }
      }
    }
  } else {
    errors.push('experience.experience must be an array');
  }

  if (Array.isArray(sections.education?.education)) {
    for (const [idx, edu] of sections.education.education.entries()) {
      const prefix = `education[${idx}]`;
      ensureId(edu, prefix, errors, seenIds);
      validateTranslatable(edu.institution?.name, `${prefix}.institution.name`, errors, warnings);
      ensureUrlOrLinkId(edu.institution?.website, `${prefix}.institution.website`, errors, linkIds);
      validateTranslatable(edu.degree, `${prefix}.degree`, errors, warnings);
      if (edu.study_type != null) {
        validateTranslatable(edu.study_type, `${prefix}.study_type`, errors, warnings, { allowString: true });
      }

      if (!isYearMonth(edu.start)) errors.push(`${prefix}.start must be YYYY-MM`);
      if (!(edu.end === 'present' || isYearMonth(edu.end))) errors.push(`${prefix}.end must be YYYY-MM or present`);
      if (isYearMonth(edu.start) && isYearMonth(edu.end) && compareYearMonth(edu.start, edu.end) > 0) {
        errors.push(`${prefix}: start must be <= end`);
      }
      if (!Array.isArray(enums.education_status) || !enums.education_status.includes(edu.status)) {
        errors.push(`${prefix}.status '${edu.status}' is invalid`);
      }
    }
  } else {
    errors.push('education.education must be an array');
  }

  if (Array.isArray(sections.skills?.skills)) {
    for (const [idx, skill] of sections.skills.skills.entries()) {
      const prefix = `skills[${idx}]`;
      ensureId(skill, prefix, errors, seenIds);
      validateTranslatable(skill.name, `${prefix}.name`, errors, warnings);
      if (!Array.isArray(enums.skill_level) || !enums.skill_level.includes(skill.level)) {
        errors.push(`${prefix}.level '${skill.level}' is invalid`);
      }
      if (!Array.isArray(skill.references)) {
        warnings.push(`${prefix}.references is missing`);
      } else {
        for (const ref of skill.references) {
          if (!expIds.has(ref) && !projectIds.has(ref)) {
            errors.push(`${prefix}.references contains unknown id '${ref}'`);
          }
        }
      }
    }
  } else {
    errors.push('skills.skills must be an array');
  }

  if (Array.isArray(sections.languages?.languages)) {
    for (const [idx, lang] of sections.languages.languages.entries()) {
      const prefix = `languages[${idx}]`;
      ensureId(lang, prefix, errors, seenIds);
      if (typeof lang.code !== 'string' || !localePattern.test(lang.code)) {
        errors.push(`${prefix}.code is invalid`);
      }
      validateTranslatable(lang.name, `${prefix}.name`, errors, warnings);
      if (!Array.isArray(enums.language_level) || !enums.language_level.includes(lang.level)) {
        errors.push(`${prefix}.level '${lang.level}' is invalid`);
      }
      if (lang.certificate_link && !looksLikeHttpsUrl(lang.certificate_link)) {
        errors.push(`${prefix}.certificate_link must be an https URL`);
      }
    }
  } else {
    errors.push('languages.languages must be an array');
  }

  if (root.profile_mode === 'public' && sections.profile?.profile?.contact?.email) {
    warnings.push('profile_mode is public: consider moving direct email to a contact link');
  }

  return { errors, warnings };
}

function main() {
  const { errors, warnings } = validateCurriculum({ repoRoot: process.cwd() });

  if (errors.length > 0) {
    console.error(`Curriculum validation failed with ${errors.length} error(s):`);
    for (const msg of errors) console.error(`- ${msg}`);
    if (warnings.length > 0) {
      console.error(`\nWarnings (${warnings.length}):`);
      for (const msg of warnings) console.error(`- ${msg}`);
    }
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`Curriculum validation passed with ${warnings.length} warning(s):`);
    for (const msg of warnings) console.log(`- ${msg}`);
  } else {
    console.log('Curriculum validation passed with no warnings.');
  }
}

if (import.meta.main) {
  main();
}
