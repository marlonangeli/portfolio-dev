#!/usr/bin/env bun
import fs from "fs";
import path from "path";
import { isValidIsoDate } from "../src/contracts/common.ts";
import { MetaSchema } from "../src/contracts/meta.ts";
import { loadYamlFile } from "./lib/yaml-lite.ts";

function walk(dir: string, list: string[] = []): string[] {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, list);
    else list.push(full);
  }
  return list;
}

function toRelatesList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

function formatZodErrors(
  prefix: string,
  issues: Array<{ path: PropertyKey[]; message: string }>,
): string[] {
  return issues.map((issue) => {
    const pathString = issue.path.length > 0 ? `.${issue.path.join(".")}` : "";
    return `${prefix}${pathString}: ${issue.message}`;
  });
}

export function validateMetadata(options: { repoRoot?: string } = {}): {
  errors: string[];
  metaFiles: string[];
} {
  const repoRoot = options.repoRoot ?? process.cwd();
  const files = walk(repoRoot);
  const metaFiles = files.filter((file) => file.endsWith(".meta.yaml"));

  const errors: string[] = [];
  const seenIds = new Map<string, string>();

  for (const metaPath of metaFiles) {
    const relMetaPath = path.relative(repoRoot, metaPath);
    const sourcePath = metaPath.replace(/\.meta\.yaml$/, ".md");
    const relSourcePath = path.relative(repoRoot, sourcePath);

    if (!fs.existsSync(sourcePath)) {
      errors.push(`${relMetaPath}: missing source markdown file ${relSourcePath}`);
    }

    let parsedMeta: unknown;
    try {
      parsedMeta = loadYamlFile(metaPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${relMetaPath}: invalid YAML (${message})`);
      continue;
    }

    const result = MetaSchema.safeParse(parsedMeta);
    if (!result.success) {
      errors.push(...formatZodErrors(relMetaPath, result.error.issues));
      continue;
    }

    const meta = result.data;

    if (!isValidIsoDate(meta.created)) {
      errors.push(`${relMetaPath}: created '${meta.created}' must be a valid ISO date YYYY-MM-DD`);
    }
    if (!isValidIsoDate(meta.updated)) {
      errors.push(`${relMetaPath}: updated '${meta.updated}' must be a valid ISO date YYYY-MM-DD`);
    }

    if (seenIds.has(meta.id)) {
      errors.push(
        `${relMetaPath}: duplicate id '${meta.id}' (also used in ${seenIds.get(meta.id)})`,
      );
    } else {
      seenIds.set(meta.id, relMetaPath);
    }

    const relates = toRelatesList(meta.relates);
    for (const relatesPath of relates) {
      const target = path.resolve(repoRoot, relatesPath);
      if (!fs.existsSync(target)) {
        errors.push(`${relMetaPath}: relates path does not exist: ${relatesPath}`);
      }
    }
  }

  return { errors, metaFiles };
}

if (import.meta.main) {
  const { errors, metaFiles } = validateMetadata({ repoRoot: process.cwd() });
  if (errors.length > 0) {
    console.error(`Metadata validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Metadata validation passed for ${metaFiles.length} file(s).`);
}
