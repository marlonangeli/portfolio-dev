import { describe, expect, it } from "bun:test";
import { dumpYaml, parseYaml } from "../scripts/lib/yaml-lite.ts";

describe("yaml-lite", () => {
  it("parses nested objects and arrays", () => {
    const raw = "root:\n  name: Marlon\n  tags:\n    - one\n    - two\n";
    const parsed = parseYaml(raw, "inline") as {
      root?: { name?: string; tags?: string[] };
    };

    expect(parsed.root?.name).toBe("Marlon");
    expect(parsed.root?.tags).toEqual(["one", "two"]);
  });

  it("dumps YAML with stable keys", () => {
    const yaml = dumpYaml({ id: "x", list: ["a", "b"] });
    expect(yaml.includes("id: x")).toBeTrue();
    expect(yaml.includes("- a")).toBeTrue();
    expect(yaml.includes("- b")).toBeTrue();
  });
});
