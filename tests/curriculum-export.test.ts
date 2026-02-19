import { describe, expect, it } from "bun:test";
import fs from "fs";
import path from "path";
import { buildCurriculumExport, exportCurriculum } from "../scripts/export-cv-jsonresume.ts";
import { createTempRepo, writeCurriculumFixture } from "./helpers/repo-fixtures.ts";

describe("curriculum export", () => {
  it("exports with profile section (not basics)", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot);

    const output = buildCurriculumExport({ repoRoot, locale: "pt-BR" }) as Record<string, unknown>;
    expect(output.profile).toBeDefined();
    expect(output.basics).toBeUndefined();
  });

  it("resolves translatable strings and locale maps", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      const firstProject = draft.sections.projects.projects[0];
      if (!firstProject) throw new Error("Missing project fixture");
      draft.sections.profile.profile.title = "Desenvolvedor";
      firstProject.name = { "pt-BR": "Projeto", en: "Project" };
    });

    const output = buildCurriculumExport({ repoRoot, locale: "en" }) as {
      profile: { label: string };
      projects: Array<{ name: string }>;
    };
    expect(output.profile.label).toBe("Desenvolvedor");
    expect(output.projects[0]?.name).toBe("Project");
  });

  it("writes export to configured path", () => {
    const repoRoot = createTempRepo();
    writeCurriculumFixture(repoRoot, (draft) => {
      draft.root.exports.json_resume_path = "dist/custom.resume.json";
    });

    const outPath = exportCurriculum({ repoRoot, locale: "pt-BR" });
    expect(path.relative(repoRoot, outPath)).toBe("dist/custom.resume.json");
    expect(fs.existsSync(outPath)).toBeTrue();
  });
});
