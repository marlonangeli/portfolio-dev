import { describe, expect, it } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { generateSchemas } from "../scripts/generate-schemas.ts";
import { validateJsonFiles } from "../scripts/validate-json.ts";
import { validateYamlFiles } from "../scripts/validate-yaml.ts";

const repoRoot = process.cwd();

describe("schema and format validations", () => {
  it("has valid JSON schemas", () => {
    const { errors } = validateJsonFiles({ repoRoot });
    expect(errors).toEqual([]);
  });

  it("has valid YAML files", () => {
    const { errors } = validateYamlFiles({ repoRoot });
    expect(errors).toEqual([]);
  });

  it("detects invalid JSON files", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "json-invalid-"));
    fs.writeFileSync(path.join(temp, "bad.json"), '{ "a": 1, }', "utf8");

    const { errors } = validateJsonFiles({ repoRoot: temp });
    expect(errors.length).toBe(1);
    expect(errors[0]?.includes("invalid JSON")).toBeTrue();
  });

  it("detects invalid YAML files", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "yaml-invalid-"));
    fs.writeFileSync(path.join(temp, "bad.yaml"), "root: bad\n  value: 1\n", "utf8");

    const { errors } = validateYamlFiles({ repoRoot: temp });
    expect(errors.length).toBe(1);
    expect(errors[0]?.includes("invalid YAML")).toBeTrue();
  });

  it("generates curriculum and metadata schemas from zod", () => {
    generateSchemas();

    const rootSchemaPath = path.join(repoRoot, "schemas/generated/curriculum/root.schema.json");
    const metaSchemaPath = path.join(repoRoot, "schemas/generated/meta.schema.json");

    expect(fs.existsSync(rootSchemaPath)).toBeTrue();
    expect(fs.existsSync(metaSchemaPath)).toBeTrue();

    const rootSchema = JSON.parse(fs.readFileSync(rootSchemaPath, "utf8")) as {
      $schema?: string;
      $id?: string;
      type?: string;
    };

    expect(rootSchema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(typeof rootSchema.$id).toBe("string");
    expect(rootSchema.type).toBe("object");
  });
});
