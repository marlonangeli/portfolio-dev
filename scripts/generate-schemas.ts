#!/usr/bin/env bun
import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CurriculumEducationSchema,
  CurriculumExperienceSchema,
  CurriculumLanguagesSchema,
  CurriculumLinksSchema,
  CurriculumProfileSchema,
  CurriculumProjectsSchema,
  CurriculumRootSchema,
  CurriculumSkillsSchema,
  CurriculumSummarySchema,
} from "../src/contracts/curriculum.ts";
import { MetaSchema } from "../src/contracts/meta.ts";

const repoRoot = process.cwd();

function writeSchema(relativePath: string, schema: z.ZodType, id: string): void {
  const target = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const jsonSchema = z.toJSONSchema(schema);
  const withMeta = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: id,
    ...jsonSchema,
  };
  fs.writeFileSync(target, `${JSON.stringify(withMeta, null, 2)}\n`, "utf8");
}

export function generateSchemas(): void {
  writeSchema(
    "schemas/generated/meta.schema.json",
    MetaSchema,
    "./schemas/generated/meta.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/root.schema.json",
    CurriculumRootSchema,
    "./schemas/generated/curriculum/root.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/profile.schema.json",
    CurriculumProfileSchema,
    "./schemas/generated/curriculum/profile.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/summary.schema.json",
    CurriculumSummarySchema,
    "./schemas/generated/curriculum/summary.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/experience.schema.json",
    CurriculumExperienceSchema,
    "./schemas/generated/curriculum/experience.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/projects.schema.json",
    CurriculumProjectsSchema,
    "./schemas/generated/curriculum/projects.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/education.schema.json",
    CurriculumEducationSchema,
    "./schemas/generated/curriculum/education.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/skills.schema.json",
    CurriculumSkillsSchema,
    "./schemas/generated/curriculum/skills.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/languages.schema.json",
    CurriculumLanguagesSchema,
    "./schemas/generated/curriculum/languages.schema.json",
  );
  writeSchema(
    "schemas/generated/curriculum/links.schema.json",
    CurriculumLinksSchema,
    "./schemas/generated/curriculum/links.schema.json",
  );
}

if (import.meta.main) {
  generateSchemas();
  console.log("Generated schemas in schemas/generated");
}
