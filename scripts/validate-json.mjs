#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';

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

export function validateJsonFiles(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const files = walk(repoRoot).filter((file) => file.endsWith('.json'));
  const errors = [];

  for (const file of files) {
    const rel = path.relative(repoRoot, file);
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      errors.push(`${rel}: invalid JSON (${err.message})`);
    }
  }

  return { files, errors };
}

function main() {
  const { files, errors } = validateJsonFiles({ repoRoot: process.cwd() });

  if (errors.length > 0) {
    console.error(`JSON validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`JSON validation passed for ${files.length} file(s).`);
}

if (import.meta.main) {
  main();
}
