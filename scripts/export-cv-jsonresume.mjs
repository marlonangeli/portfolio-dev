#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import { loadYamlFile } from './lib/yaml-lite.mjs';
import { looksLikeHttpsUrl, readTranslatable } from './lib/curriculum.mjs';

function resolveLinkUrl(value, links) {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (looksLikeHttpsUrl(value)) return value;
  return links.get(value)?.url || '';
}

export function buildCurriculumExport(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const root = loadYamlFile(path.join(repoRoot, 'curriculum/cv.yaml'));

  const locale =
    options.locale ||
    process.argv.find((arg) => arg.startsWith('--locale='))?.split('=')[1] ||
    root.default_locale ||
    'pt-BR';

  const sections = {};
  for (const [key, relPath] of Object.entries(root.sections || {})) {
    sections[key] = loadYamlFile(path.join(repoRoot, relPath));
  }

  const links = new Map((sections.links?.links || []).map((l) => [l.id, l]));
  const profile = sections.profile?.profile || {};

  const profileLinks = Array.isArray(profile.links)
    ? profile.links
      .map((id) => links.get(id))
      .filter(Boolean)
      .map((link) => ({
        network: link.kind,
        url: link.url,
        username: readTranslatable(link.label, locale),
      }))
    : [];

  return {
    profile: {
      name: readTranslatable(profile.name, locale),
      label: readTranslatable(profile.title, locale),
      email: profile.contact?.email || '',
      image: profile.contact?.picture_url || '',
      location: {
        region: readTranslatable(profile.location?.region, locale),
        countryCode: profile.location?.country_code || '',
      },
      links: profileLinks,
    },
    work: (sections.experience?.experience || []).map((exp) => ({
      name: readTranslatable(exp.company?.name, locale),
      location: '',
      position: readTranslatable(exp.role, locale),
      website: resolveLinkUrl(exp.company?.website, links),
      startDate: exp.start,
      endDate: exp.end === 'present' ? '' : exp.end,
      summary: (exp.achievements || []).map((a) => readTranslatable(a, locale)).join(' '),
      highlights: (exp.achievements || []).map((a) => readTranslatable(a, locale)),
    })),
    education: (sections.education?.education || []).map((edu) => ({
      institution: readTranslatable(edu.institution?.name, locale),
      area: readTranslatable(edu.degree, locale),
      studyType: readTranslatable(edu.study_type, locale) || 'Bachelor',
      startDate: edu.start,
      endDate: edu.end === 'present' ? '' : edu.end,
      website: resolveLinkUrl(edu.institution?.website, links),
    })),
    skills: (sections.skills?.skills || []).map((skill) => ({
      name: readTranslatable(skill.name, locale),
      level: skill.level,
      keywords: Array.isArray(skill.references) ? skill.references : [],
    })),
    projects: (sections.projects?.projects || []).map((project) => ({
      name: readTranslatable(project.name, locale),
      description: readTranslatable(project.description, locale),
      url: project.links?.map((id) => links.get(id)?.url).filter(Boolean)?.[0] || '',
      keywords: Array.isArray(project.technologies) ? project.technologies : [],
    })),
    languages: (sections.languages?.languages || []).map((lang) => ({
      language: readTranslatable(lang.name, locale),
      fluency: lang.level,
    })),
    x_portfolio: {
      source: 'curriculum/cv.yaml',
      locale,
      supported_locales: root.supported_locales || [],
    },
  };
}

export function exportCurriculum(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const root = loadYamlFile(path.join(repoRoot, 'curriculum/cv.yaml'));
  const output = buildCurriculumExport(options);

  const outPath = path.join(repoRoot, root.exports?.json_resume_path || 'dist/cv.resume.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  return outPath;
}

function main() {
  const outPath = exportCurriculum({ repoRoot: process.cwd() });
  console.log(`Exported JSON Resume to ${path.relative(process.cwd(), outPath)}`);
}

if (import.meta.main) {
  main();
}
