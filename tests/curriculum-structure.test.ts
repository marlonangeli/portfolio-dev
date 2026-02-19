import { describe, expect, it } from "bun:test";
import fs from "fs";
import path from "path";
import { loadYamlFile } from "../scripts/lib/yaml-lite.ts";

const repoRoot = process.cwd();

describe("curriculum structure", () => {
  it("uses curriculum/cv.yaml as canonical root", () => {
    const root = loadYamlFile(path.join(repoRoot, "curriculum/cv.yaml")) as {
      id?: string;
      sections?: { profile?: string };
    };

    expect(root.id).toBe("cv-main");
    expect(root.sections?.profile).toBe("curriculum/profile.yaml");
  });

  it("has all section files referenced by root", () => {
    const root = loadYamlFile(path.join(repoRoot, "curriculum/cv.yaml")) as {
      sections?: Record<string, string>;
    };

    for (const relPath of Object.values(root.sections ?? {})) {
      const abs = path.join(repoRoot, relPath);
      expect(fs.existsSync(abs)).toBeTrue();
    }
  });
});
