import { describe, expect, it } from "bun:test";
import { validateCurriculum } from "../scripts/validate-curriculum.ts";
import { createTempRepo, writeCurriculumFixture } from "./helpers/repo-fixtures.ts";

describe("curriculum validation", () => {
  it("accepts locale-map translatable fields", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot);

    const result = validateCurriculum({ repoRoot });
    expect(result.errors).toEqual([]);
  });

  it("accepts single-line strings for translatable fields", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      const firstProject = draft.sections.projects.projects[0];
      const firstExperience = draft.sections.experience.experience[0];
      const firstEducation = draft.sections.education.education[0];
      const firstSkill = draft.sections.skills.skills[0];
      if (!firstProject || !firstExperience || !firstEducation || !firstSkill) {
        throw new Error("Missing fixture entries");
      }
      draft.sections.profile.profile.name = "Marlon";
      firstProject.description = "Descricao unica";
      firstExperience.role = "Dev";
      firstExperience.achievements = ["Contribui com X"];
      firstEducation.degree = "Computacao";
      firstSkill.name = ".NET";
    });

    const result = validateCurriculum({ repoRoot });
    expect(result.errors).toEqual([]);
  });

  it("fails when locale map misses pt-BR", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      const firstProject = draft.sections.projects.projects[0];
      if (!firstProject) throw new Error("Missing project fixture");
      firstProject.name = { en: "Project Only" };
    });

    const result = validateCurriculum({ repoRoot });
    expect(
      result.errors.some((msg) =>
        msg.includes("curriculum/projects.yaml.projects.0.name: Locale map requires pt-BR"),
      ),
    ).toBeTrue();
  });

  it("fails with invalid locale key", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      draft.sections.summary.summary.objective = { portuguese: "Texto" };
    });

    const result = validateCurriculum({ repoRoot });
    expect(
      result.errors.some((msg) =>
        msg.includes(
          "curriculum/summary.yaml.summary.objective: Locale map has invalid locale keys",
        ),
      ),
    ).toBeTrue();
  });

  it("fails when link references are broken", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      const firstExperience = draft.sections.experience.experience[0];
      if (!firstExperience) throw new Error("Missing experience fixture");
      draft.sections.profile.profile.links = ["missing-link"];
      firstExperience.company.website = "missing-link";
    });

    const result = validateCurriculum({ repoRoot });
    expect(
      result.errors.some((msg) =>
        msg.includes("profile.links references unknown id 'missing-link'"),
      ),
    ).toBeTrue();
    expect(
      result.errors.some((msg) =>
        msg.includes("experience[0].company.website must be an https URL or an existing link id"),
      ),
    ).toBeTrue();
  });

  it("fails when date ranges are inverted", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      const firstEducation = draft.sections.education.education[0];
      if (!firstEducation) throw new Error("Missing education fixture");
      firstEducation.start = "2026-01";
      firstEducation.end = "2025-01";
    });

    const result = validateCurriculum({ repoRoot });
    expect(
      result.errors.some((msg) => msg.includes("education[0]: start must be <= end")),
    ).toBeTrue();
  });

  it("fails when exports.json_resume_path is missing", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      draft.root.exports = { json_resume: true };
    });

    const result = validateCurriculum({ repoRoot });
    expect(result.errors.some((msg) => msg.includes("exports.json_resume_path"))).toBeTrue();
  });
});
