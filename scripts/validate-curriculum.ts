#!/usr/bin/env bun
import fs from "fs";
import path from "path";
import {
  ID_REGEX,
  LOCALE_REGEX,
  compareYearMonth,
  isValidIsoDate,
  isValidYearMonth,
} from "../src/contracts/common.ts";
import {
  CurriculumEducationSchema,
  CurriculumExperienceSchema,
  CurriculumLanguagesSchema,
  CurriculumLinksSchema,
  CurriculumProfileSchema,
  CurriculumProjectsSchema,
  CurriculumRootSchema,
  CurriculumSkillsSchema,
  CurriculumSummarySchema,
  PROFILE_MODES,
} from "../src/contracts/curriculum.ts";
import { looksLikeHttpsUrl } from "./lib/curriculum.ts";
import { loadYamlFile } from "./lib/yaml-lite.ts";

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatZodErrors(
  prefix: string,
  issues: Array<{ path: PropertyKey[]; message: string }>,
): string[] {
  return issues.map((issue) => {
    const suffix = issue.path.length > 0 ? `.${issue.path.join(".")}` : "";
    return `${prefix}${suffix}: ${issue.message}`;
  });
}

function ensureId(
  id: string | undefined,
  fieldName: string,
  errors: string[],
  seen: Map<string, string>,
): void {
  if (!id || !ID_REGEX.test(id)) {
    errors.push(`${fieldName} id is required and must match ${ID_REGEX}`);
    return;
  }
  if (seen.has(id)) {
    errors.push(`${fieldName} duplicate id '${id}' (first seen at ${seen.get(id)})`);
  } else {
    seen.set(id, fieldName);
  }
}

function ensureUrlOrLinkId(
  value: unknown,
  fieldName: string,
  errors: string[],
  linkIds: Set<string>,
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${fieldName} must be a non-empty string URL or link id`);
    return;
  }
  if (looksLikeHttpsUrl(value) || linkIds.has(value)) return;
  errors.push(`${fieldName} must be an https URL or an existing link id`);
}

export function validateCurriculum(options: { repoRoot?: string } = {}): {
  errors: string[];
  warnings: string[];
} {
  const repoRoot = options.repoRoot ?? process.cwd();
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Map<string, string>();

  const rootPath = path.join(repoRoot, "curriculum/cv.yaml");
  if (!fs.existsSync(rootPath)) {
    errors.push("Missing curriculum/cv.yaml");
    return { errors, warnings };
  }

  const rootRaw = loadYamlFile(rootPath);
  const rootParsed = CurriculumRootSchema.safeParse(rootRaw);
  if (!rootParsed.success) {
    errors.push(...formatZodErrors("curriculum/cv.yaml", rootParsed.error.issues));
    return { errors, warnings };
  }

  const root = rootParsed.data;

  if (!isValidIsoDate(root.updated)) {
    errors.push("curriculum/cv.yaml: 'updated' must be valid YYYY-MM-DD");
  }
  if (!root.supported_locales.includes(root.default_locale)) {
    errors.push("curriculum/cv.yaml: default_locale must be in supported_locales");
  }
  if (!root.supported_locales.includes("pt-BR")) {
    errors.push("curriculum/cv.yaml: supported_locales must include 'pt-BR'");
  }
  for (const locale of root.supported_locales) {
    if (!LOCALE_REGEX.test(locale)) {
      errors.push(`curriculum/cv.yaml: invalid locale '${locale}' in supported_locales`);
    }
  }
  if (!PROFILE_MODES.includes(root.profile_mode)) {
    errors.push(`curriculum/cv.yaml: invalid profile_mode '${root.profile_mode}'`);
  }
  if (
    root.exports.json_resume &&
    (!root.exports.json_resume_path || root.exports.json_resume_path.length === 0)
  ) {
    errors.push(
      "curriculum/cv.yaml: exports.json_resume_path must be set when json_resume is true",
    );
  }

  const sectionFiles = root.sections;
  const sectionData: Record<string, unknown> = {};
  for (const [key, relativePath] of Object.entries(sectionFiles)) {
    const abs = path.join(repoRoot, relativePath);
    if (!fs.existsSync(abs)) {
      errors.push(`curriculum/cv.yaml: sections.${key} path not found: ${relativePath}`);
      continue;
    }
    sectionData[key] = loadYamlFile(abs);
  }

  const parsedLinks = CurriculumLinksSchema.safeParse(sectionData.links);
  const parsedProfile = CurriculumProfileSchema.safeParse(sectionData.profile);
  const parsedSummary = CurriculumSummarySchema.safeParse(sectionData.summary);
  const parsedExperience = CurriculumExperienceSchema.safeParse(sectionData.experience);
  const parsedProjects = CurriculumProjectsSchema.safeParse(sectionData.projects);
  const parsedEducation = CurriculumEducationSchema.safeParse(sectionData.education);
  const parsedSkills = CurriculumSkillsSchema.safeParse(sectionData.skills);
  const parsedLanguages = CurriculumLanguagesSchema.safeParse(sectionData.languages);

  if (!parsedLinks.success) {
    errors.push(...formatZodErrors("curriculum/links.yaml", parsedLinks.error.issues));
  }
  if (!parsedProfile.success) {
    errors.push(...formatZodErrors("curriculum/profile.yaml", parsedProfile.error.issues));
  }
  if (!parsedSummary.success) {
    errors.push(...formatZodErrors("curriculum/summary.yaml", parsedSummary.error.issues));
  }
  if (!parsedExperience.success) {
    errors.push(...formatZodErrors("curriculum/experience.yaml", parsedExperience.error.issues));
  }
  if (!parsedProjects.success) {
    errors.push(...formatZodErrors("curriculum/projects.yaml", parsedProjects.error.issues));
  }
  if (!parsedEducation.success) {
    errors.push(...formatZodErrors("curriculum/education.yaml", parsedEducation.error.issues));
  }
  if (!parsedSkills.success) {
    errors.push(...formatZodErrors("curriculum/skills.yaml", parsedSkills.error.issues));
  }
  if (!parsedLanguages.success) {
    errors.push(...formatZodErrors("curriculum/languages.yaml", parsedLanguages.error.issues));
  }

  if (
    !parsedLinks.success ||
    !parsedProfile.success ||
    !parsedSummary.success ||
    !parsedExperience.success ||
    !parsedProjects.success ||
    !parsedEducation.success ||
    !parsedSkills.success ||
    !parsedLanguages.success
  ) {
    return { errors, warnings };
  }

  const links = parsedLinks.data.links;
  const profile = parsedProfile.data.profile;
  const summary = parsedSummary.data.summary;
  const experiences = parsedExperience.data.experience;
  const projects = parsedProjects.data.projects;
  const education = parsedEducation.data.education;
  const skills = parsedSkills.data.skills;
  const languages = parsedLanguages.data.languages;

  ensureId(profile.id, "profile", errors, seenIds);
  ensureId(summary.id, "summary", errors, seenIds);

  const linkIds = new Set<string>();
  for (const [index, link] of links.entries()) {
    ensureId(link.id, `links[${index}]`, errors, seenIds);
    if (link.id) linkIds.add(link.id);
  }

  for (const linkId of profile.links) {
    if (!linkIds.has(linkId)) errors.push(`profile.links references unknown id '${linkId}'`);
  }

  const projectIds = new Set<string>();
  for (const [index, project] of projects.entries()) {
    ensureId(project.id, `projects[${index}]`, errors, seenIds);
    if (project.id) projectIds.add(project.id);
    for (const linkId of project.links) {
      if (!linkIds.has(linkId))
        errors.push(`projects[${index}].links references unknown id '${linkId}'`);
    }
  }

  const experienceIds = new Set<string>();
  for (const [index, exp] of experiences.entries()) {
    ensureId(exp.id, `experience[${index}]`, errors, seenIds);
    if (exp.id) experienceIds.add(exp.id);

    ensureUrlOrLinkId(exp.company.website, `experience[${index}].company.website`, errors, linkIds);

    if (!isValidYearMonth(exp.start)) {
      errors.push(`experience[${index}].start must be valid YYYY-MM`);
    }
    if (exp.end !== "present" && !isValidYearMonth(exp.end)) {
      errors.push(`experience[${index}].end must be valid YYYY-MM or present`);
    }
    if (exp.end !== "present" && isValidYearMonth(exp.start) && isValidYearMonth(exp.end)) {
      if (compareYearMonth(exp.start, exp.end) > 0) {
        errors.push(`experience[${index}]: start must be <= end`);
      }
    }

    for (const rel of exp.related_links ?? []) {
      if (!linkIds.has(rel))
        errors.push(`experience[${index}].related_links references unknown id '${rel}'`);
    }
  }

  for (const [index, edu] of education.entries()) {
    ensureId(edu.id, `education[${index}]`, errors, seenIds);
    ensureUrlOrLinkId(
      edu.institution.website,
      `education[${index}].institution.website`,
      errors,
      linkIds,
    );

    if (!isValidYearMonth(edu.start)) {
      errors.push(`education[${index}].start must be valid YYYY-MM`);
    }
    if (edu.end !== "present" && !isValidYearMonth(edu.end)) {
      errors.push(`education[${index}].end must be valid YYYY-MM or present`);
    }
    if (edu.end !== "present" && isValidYearMonth(edu.start) && isValidYearMonth(edu.end)) {
      if (compareYearMonth(edu.start, edu.end) > 0) {
        errors.push(`education[${index}]: start must be <= end`);
      }
    }
  }

  for (const [index, skill] of skills.entries()) {
    ensureId(skill.id, `skills[${index}]`, errors, seenIds);
    for (const ref of skill.references ?? []) {
      if (!experienceIds.has(ref) && !projectIds.has(ref)) {
        errors.push(`skills[${index}].references contains unknown id '${ref}'`);
      }
    }
  }

  for (const [index, language] of languages.entries()) {
    ensureId(language.id, `languages[${index}]`, errors, seenIds);
    if (!LOCALE_REGEX.test(language.code)) {
      errors.push(`languages[${index}].code is invalid`);
    }
  }

  const profileContact = asObject(profile.contact);
  const maybeEmail = profileContact.email;
  if (root.profile_mode === "public" && typeof maybeEmail === "string" && maybeEmail.length > 0) {
    warnings.push("profile_mode is public: consider moving direct email to a contact link");
  }

  return { errors, warnings };
}

if (import.meta.main) {
  const { errors, warnings } = validateCurriculum({ repoRoot: process.cwd() });
  if (errors.length > 0) {
    console.error(`Curriculum validation failed with ${errors.length} error(s):`);
    for (const msg of errors) console.error(`- ${msg}`);
    if (warnings.length > 0) {
      console.error(`\\nWarnings (${warnings.length}):`);
      for (const msg of warnings) console.error(`- ${msg}`);
    }
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`Curriculum validation passed with ${warnings.length} warning(s):`);
    for (const msg of warnings) console.log(`- ${msg}`);
  } else {
    console.log("Curriculum validation passed with no warnings.");
  }
}
