#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import { loadYamlFile } from './lib/yaml-lite.mjs';

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.idea') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, list);
    } else {
      list.push(full);
    }
  }
  return list;
}

export function validateYamlFiles(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const files = walk(repoRoot).filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));
  const errors = [];

  for (const file of files) {
    const rel = path.relative(repoRoot, file);
    try {
      loadYamlFile(file);
    } catch (err) {
      errors.push(`${rel}: invalid YAML (${err.message})`);
    }
  }

  return { files, errors };
}

function main() {
  const { files, errors } = validateYamlFiles({ repoRoot: process.cwd() });

  if (errors.length > 0) {
    console.error(`YAML validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`YAML validation passed for ${files.length} file(s).`);
}

if (import.meta.main) {
  main();
}
