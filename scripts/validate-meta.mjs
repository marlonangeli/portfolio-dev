#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import { loadYamlFile } from './lib/yaml-lite.mjs';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const idPattern = /^[a-z0-9][a-z0-9._-]*$/;

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, list);
    } else {
      list.push(full);
    }
  }
  return list;
}

function isDateString(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function loadRegistries(repoRoot) {
  const categories = loadYamlFile(path.join(repoRoot, 'specs/_registry/categories.yaml'));
  const priorities = loadYamlFile(path.join(repoRoot, 'specs/_registry/priorities.yaml'));
  const statuses = loadYamlFile(path.join(repoRoot, 'specs/_registry/statuses.yaml'));

  const toIdSet = (items, name) => {
    if (!Array.isArray(items)) throw new Error(`${name} must be a YAML array`);
    const ids = new Set();
    for (const item of items) {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string') {
        throw new Error(`${name} entries must be objects with string id`);
      }
      ids.add(item.id);
    }
    return ids;
  };

  return {
    categoryIds: toIdSet(categories, 'categories'),
    priorityIds: toIdSet(priorities, 'priorities'),
    statusIds: toIdSet(statuses, 'statuses'),
  };
}

function validateMeta(metaPath, meta, registries, errors, seenIds, repoRoot) {
  const relMetaPath = path.relative(repoRoot, metaPath);
  const sourcePath = metaPath.replace(/\.meta\.yaml$/, '.md');
  const relSourcePath = path.relative(repoRoot, sourcePath);

  if (!fs.existsSync(sourcePath)) {
    errors.push(`${relMetaPath}: missing source markdown file ${relSourcePath}`);
  }

  const required = ['id', 'title', 'doc_type', 'category', 'priority', 'status', 'created', 'updated', 'version', 'changelog'];
  for (const key of required) {
    if (!(key in meta)) errors.push(`${relMetaPath}: missing required field '${key}'`);
  }

  if (meta.id && !idPattern.test(meta.id)) {
    errors.push(`${relMetaPath}: id '${meta.id}' must match ${idPattern}`);
  }

  if (meta.id) {
    if (seenIds.has(meta.id)) {
      errors.push(`${relMetaPath}: duplicate id '${meta.id}' (also used in ${seenIds.get(meta.id)})`);
    } else {
      seenIds.set(meta.id, relMetaPath);
    }
  }

  if (meta.category && !registries.categoryIds.has(meta.category)) {
    errors.push(`${relMetaPath}: category '${meta.category}' is not defined in specs/_registry/categories.yaml`);
  }

  if (meta.priority && !registries.priorityIds.has(meta.priority)) {
    errors.push(`${relMetaPath}: priority '${meta.priority}' is not defined in specs/_registry/priorities.yaml`);
  }

  if (meta.status && !registries.statusIds.has(meta.status)) {
    errors.push(`${relMetaPath}: status '${meta.status}' is not defined in specs/_registry/statuses.yaml`);
  }

  if (meta.created && !isDateString(meta.created)) {
    errors.push(`${relMetaPath}: created '${meta.created}' must be a valid ISO date YYYY-MM-DD`);
  }

  if (meta.updated && !isDateString(meta.updated)) {
    errors.push(`${relMetaPath}: updated '${meta.updated}' must be a valid ISO date YYYY-MM-DD`);
  }

  if (meta.version && (typeof meta.version !== 'string' || !semverPattern.test(meta.version))) {
    errors.push(`${relMetaPath}: version '${meta.version}' must be semantic versioning (e.g. 1.0.0)`);
  }

  if (!Array.isArray(meta.changelog) || meta.changelog.length === 0 || meta.changelog.some((v) => typeof v !== 'string' || !v.trim())) {
    errors.push(`${relMetaPath}: changelog must be a non-empty array of strings`);
  }

  const relates = toList(meta.relates);
  for (const rel of relates) {
    if (typeof rel !== 'string' || !rel.trim()) {
      errors.push(`${relMetaPath}: relates entries must be non-empty strings`);
      continue;
    }
    const target = path.resolve(repoRoot, rel);
    if (!fs.existsSync(target)) {
      errors.push(`${relMetaPath}: relates path does not exist: ${rel}`);
    }
  }
}

export function validateMetadata(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const files = walk(repoRoot);
  const metaFiles = files.filter((file) => file.endsWith('.meta.yaml'));

  const errors = [];
  const seenIds = new Map();

  let registries;
  try {
    registries = loadRegistries(repoRoot);
  } catch (err) {
    return { errors: [err.message], metaFiles };
  }

  for (const metaPath of metaFiles) {
    let meta;
    try {
      meta = loadYamlFile(metaPath);
    } catch (err) {
      errors.push(`${path.relative(repoRoot, metaPath)}: invalid YAML (${err.message})`);
      continue;
    }
    if (!meta || Array.isArray(meta) || typeof meta !== 'object') {
      errors.push(`${path.relative(repoRoot, metaPath)}: root must be a mapping/object`);
      continue;
    }
    validateMeta(metaPath, meta, registries, errors, seenIds, repoRoot);
  }

  return { errors, metaFiles };
}

function main() {
  const { errors, metaFiles } = validateMetadata({ repoRoot: process.cwd() });

  if (errors.length > 0) {
    console.error(`Metadata validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Metadata validation passed for ${metaFiles.length} file(s).`);
}

if (import.meta.main) {
  main();
}
