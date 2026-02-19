#!/usr/bin/env bun
import fs from "fs";
import path from "path";
import { CurriculumRootSchema } from "../src/contracts/curriculum.ts";
import { looksLikeHttpsUrl, readTranslatable } from "./lib/curriculum.ts";
import { loadYamlFile } from "./lib/yaml-lite.ts";

function resolveLinkUrl(value: unknown, links: Map<string, { url: string }>): string {
  if (typeof value !== "string" || !value.trim()) return "";
  if (looksLikeHttpsUrl(value)) return value;
  return links.get(value)?.url ?? "";
}

function readCliLocale(): string | undefined {
  const arg = process.argv.find((item) => item.startsWith("--locale="));
  return arg ? arg.split("=")[1] : undefined;
}

type ExportOptions = {
  repoRoot?: string;
  locale?: string;
};

export function buildCurriculumExport(options: ExportOptions = {}): Record<string, unknown> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const rootRaw = loadYamlFile(path.join(repoRoot, "curriculum/cv.yaml"));
  const rootParsed = CurriculumRootSchema.parse(rootRaw);

  const locale = options.locale ?? readCliLocale() ?? rootParsed.default_locale ?? "pt-BR";

  const sections: Record<string, unknown> = {};
  for (const [key, relPath] of Object.entries(rootParsed.sections)) {
    sections[key] = loadYamlFile(path.join(repoRoot, relPath));
  }

  const linksSection = sections.links as {
    links?: Array<{ id: string; kind: string; url: string; label: unknown }>;
  };
  const profileSection = sections.profile as {
    profile?: {
      name?: unknown;
      title?: unknown;
      location?: { region?: unknown; country_code?: string };
      contact?: { email?: string; picture_url?: string };
      links?: string[];
    };
  };

  const links = new Map((linksSection.links ?? []).map((item) => [item.id, item]));
  const profile = profileSection.profile ?? {};

  const profileLinks = Array.isArray(profile.links)
    ? profile.links
        .map((id) => links.get(id))
        .filter(
          (item): item is { id: string; kind: string; url: string; label: unknown } =>
            item !== undefined,
        )
        .map((link) => ({
          network: link.kind,
          url: link.url,
          username: readTranslatable(link.label, locale),
        }))
    : [];

  const experience = ((sections.experience as { experience?: unknown[] }).experience ??
    []) as Array<Record<string, unknown>>;
  const education = ((sections.education as { education?: unknown[] }).education ?? []) as Array<
    Record<string, unknown>
  >;
  const skills = ((sections.skills as { skills?: unknown[] }).skills ?? []) as Array<
    Record<string, unknown>
  >;
  const projects = ((sections.projects as { projects?: unknown[] }).projects ?? []) as Array<
    Record<string, unknown>
  >;
  const languages = ((sections.languages as { languages?: unknown[] }).languages ?? []) as Array<
    Record<string, unknown>
  >;

  return {
    profile: {
      name: readTranslatable(profile.name, locale),
      label: readTranslatable(profile.title, locale),
      email: profile.contact?.email ?? "",
      image: profile.contact?.picture_url ?? "",
      location: {
        region: readTranslatable(profile.location?.region, locale),
        countryCode: profile.location?.country_code ?? "",
      },
      links: profileLinks,
    },
    work: experience.map((item) => ({
      name: readTranslatable((item.company as Record<string, unknown> | undefined)?.name, locale),
      location: "",
      position: readTranslatable(item.role, locale),
      website: resolveLinkUrl(
        (item.company as Record<string, unknown> | undefined)?.website,
        links,
      ),
      startDate: item.start ?? "",
      endDate: item.end === "present" ? "" : (item.end ?? ""),
      summary: Array.isArray(item.achievements)
        ? item.achievements.map((a) => readTranslatable(a, locale)).join(" ")
        : "",
      highlights: Array.isArray(item.achievements)
        ? item.achievements.map((a) => readTranslatable(a, locale))
        : [],
    })),
    education: education.map((item) => ({
      institution: readTranslatable(
        (item.institution as Record<string, unknown> | undefined)?.name,
        locale,
      ),
      area: readTranslatable(item.degree, locale),
      studyType: readTranslatable(item.study_type, locale) || "Bachelor",
      startDate: item.start ?? "",
      endDate: item.end === "present" ? "" : (item.end ?? ""),
      website: resolveLinkUrl(
        (item.institution as Record<string, unknown> | undefined)?.website,
        links,
      ),
    })),
    skills: skills.map((item) => ({
      name: readTranslatable(item.name, locale),
      level: item.level ?? "",
      keywords: Array.isArray(item.references) ? item.references : [],
    })),
    projects: projects.map((item) => ({
      name: readTranslatable(item.name, locale),
      description: readTranslatable(item.description, locale),
      url: Array.isArray(item.links)
        ? (item.links
            .map((id) => (typeof id === "string" ? links.get(id)?.url : undefined))
            .find((value): value is string => typeof value === "string") ?? "")
        : "",
      keywords: Array.isArray(item.technologies) ? item.technologies : [],
    })),
    languages: languages.map((item) => ({
      language: readTranslatable(item.name, locale),
      fluency: item.level ?? "",
    })),
    x_portfolio: {
      source: "curriculum/cv.yaml",
      locale,
      supported_locales: rootParsed.supported_locales,
    },
  };
}

export function exportCurriculum(options: ExportOptions = {}): string {
  const repoRoot = options.repoRoot ?? process.cwd();
  const rootRaw = loadYamlFile(path.join(repoRoot, "curriculum/cv.yaml"));
  const rootParsed = CurriculumRootSchema.parse(rootRaw);

  const output = buildCurriculumExport(options);
  const outputPath = path.join(
    repoRoot,
    rootParsed.exports.json_resume_path ?? "dist/cv.resume.json",
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\\n`, "utf8");

  return outputPath;
}

if (import.meta.main) {
  const outPath = exportCurriculum({ repoRoot: process.cwd() });
  console.log(`Exported JSON Resume to ${path.relative(process.cwd(), outPath)}`);
}
