import { describe, expect, it } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { validateJsonFiles } from '../scripts/validate-json.mjs';
import { validateYamlFiles } from '../scripts/validate-yaml.mjs';

const repoRoot = process.cwd();

describe('schema and format validations', () => {
  it('has valid JSON schemas', () => {
    const { errors } = validateJsonFiles({ repoRoot });
    expect(errors).toEqual([]);
  });

  it('has valid YAML files', () => {
    const { errors } = validateYamlFiles({ repoRoot });
    expect(errors).toEqual([]);
  });

  it('detects invalid JSON files', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'json-invalid-'));
    fs.writeFileSync(path.join(temp, 'bad.json'), '{ "a": 1, }', 'utf8');

    const { errors } = validateJsonFiles({ repoRoot: temp });
    expect(errors.length).toBe(1);
    expect(errors[0].includes('invalid JSON')).toBeTrue();
  });

  it('detects invalid YAML files', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-invalid-'));
    fs.writeFileSync(path.join(temp, 'bad.yaml'), 'root: bad\n  value: 1\n', 'utf8');

    const { errors } = validateYamlFiles({ repoRoot: temp });
    expect(errors.length).toBe(1);
    expect(errors[0].includes('invalid YAML')).toBeTrue();
  });

  it('defines translatableText in common schema as string or locale map', () => {
    const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'schemas/curriculum/common.schema.json'), 'utf8'));
    const translatable = schema.$defs?.translatableText;

    expect(Array.isArray(translatable.anyOf)).toBeTrue();
    expect(translatable.anyOf.length).toBe(2);
    expect(translatable.anyOf[0].type).toBe('string');
    expect(typeof translatable.anyOf[1].$ref).toBe('string');
  });
});
