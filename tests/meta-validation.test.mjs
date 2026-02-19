import { describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { saveYamlFile } from '../scripts/lib/yaml-lite.mjs';
import { validateMetadata } from '../scripts/validate-meta.mjs';
import { createTempRepo, writeMetaFixture } from './helpers/repo-fixtures.mjs';

describe('metadata validation', () => {
  it('passes for a valid metadata file', () => {
    const repoRoot = createTempRepo();
    writeMetaFixture(repoRoot);

    const result = validateMetadata({ repoRoot });
    expect(result.errors).toEqual([]);
  });

  it('fails for unknown enums and broken relates path', () => {
    const repoRoot = createTempRepo();
    writeMetaFixture(repoRoot, (draft) => {
      draft.meta.category = 'missing-category';
      draft.meta.priority = 'missing-priority';
      draft.meta.status = 'missing-status';
      draft.meta.relates = ['specs/missing.md'];
    });

    const result = validateMetadata({ repoRoot });
    expect(result.errors.some((msg) => msg.includes("category 'missing-category'"))).toBeTrue();
    expect(result.errors.some((msg) => msg.includes("priority 'missing-priority'"))).toBeTrue();
    expect(result.errors.some((msg) => msg.includes("status 'missing-status'"))).toBeTrue();
    expect(result.errors.some((msg) => msg.includes('relates path does not exist'))).toBeTrue();
  });

  it('fails for duplicate metadata ids', () => {
    const repoRoot = createTempRepo();
    writeMetaFixture(repoRoot);

    fs.writeFileSync(path.join(repoRoot, 'specs/second.md'), '# Second\n', 'utf8');
    saveYamlFile(path.join(repoRoot, 'specs/second.meta.yaml'), {
      id: 'doc-main',
      title: 'Second',
      doc_type: 'guide',
      category: 'workflow',
      priority: 'high',
      status: 'approved',
      created: '2026-02-19',
      updated: '2026-02-19',
      version: '1.0.0',
      changelog: ['Added second'],
      relates: ['specs/second.md'],
    });

    const result = validateMetadata({ repoRoot });
    expect(result.errors.some((msg) => msg.includes("duplicate id 'doc-main'"))).toBeTrue();
  });
});
