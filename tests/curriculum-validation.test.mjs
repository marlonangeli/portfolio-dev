import { describe, expect, it } from 'bun:test';
import { validateCurriculum } from '../scripts/validate-curriculum.mjs';
import { createTempRepo, writeCurriculumFixture } from './helpers/repo-fixtures.mjs';

describe('curriculum validation', () => {
  it('accepts locale-map translatable fields', () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot);

    const result = validateCurriculum({ repoRoot });
    expect(result.errors).toEqual([]);
  });

  it('accepts single-line strings for translatable fields', () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      draft.sections.profile.profile.name = 'Marlon';
      draft.sections.projects.projects[0].description = 'Descricao unica';
      draft.sections.experience.experience[0].role = 'Dev';
      draft.sections.experience.experience[0].achievements = ['Contribui com X'];
      draft.sections.education.education[0].degree = 'Computacao';
      draft.sections.skills.skills[0].name = '.NET';
    });

    const result = validateCurriculum({ repoRoot });
    expect(result.errors).toEqual([]);
  });

  it('fails when locale map misses pt-BR', () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      draft.sections.projects.projects[0].name = { en: 'Project Only' };
    });

    const result = validateCurriculum({ repoRoot });
    expect(result.errors.some((msg) => msg.includes('projects[0].name.pt-BR is required'))).toBeTrue();
  });

  it('fails with invalid locale key', () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      draft.sections.summary.summary.objective = { portuguese: 'Texto' };
    });

    const result = validateCurriculum({ repoRoot });
    expect(result.errors.some((msg) => msg.includes("summary.objective has invalid locale key 'portuguese'"))).toBeTrue();
  });

  it('fails when link references are broken', () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      draft.sections.profile.profile.links = ['missing-link'];
      draft.sections.experience.experience[0].company.website = 'missing-link';
    });

    const result = validateCurriculum({ repoRoot });
    expect(result.errors.some((msg) => msg.includes("profile.links references unknown id 'missing-link'"))).toBeTrue();
    expect(result.errors.some((msg) => msg.includes('experience[0].company.website must be an https URL or an existing link id'))).toBeTrue();
  });

  it('fails when date ranges are inverted', () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      draft.sections.education.education[0].start = '2026-01';
      draft.sections.education.education[0].end = '2025-01';
    });

    const result = validateCurriculum({ repoRoot });
    expect(result.errors.some((msg) => msg.includes('education[0]: start must be <= end'))).toBeTrue();
  });

  it('fails when exports.json_resume_path is missing', () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      delete draft.root.exports.json_resume_path;
    });

    const result = validateCurriculum({ repoRoot });
    expect(result.errors.some((msg) => msg.includes('exports.json_resume_path'))).toBeTrue();
  });
});
