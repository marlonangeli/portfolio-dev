#!/usr/bin/env bun
import fs from "bun:fs";
import path from "bun:path";

const repoRoot = process.cwd();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const idPattern = /^[a-z0-9][a-z0-9._-]*$/;

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, list);
    } else {
      list.push(full);
    }
  }
  return list;
}

function isDateString(v) {
  if (typeof v !== "string" || !datePattern.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function parseScalar(value) {
  const v = value.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function parseYamlLike(text, filePath) {
  const lines = text.replace(/\r/g, "").split("\n");

  function nextMeaningfulIndex(start) {
    let i = start;
    while (i < lines.length) {
      const raw = lines[i];
      if (raw.trim() === "" || raw.trim().startsWith("#")) {
        i += 1;
        continue;
      }
      return i;
    }
    return i;
  }

  function parseBlock(start, indent) {
    let i = nextMeaningfulIndex(start);
    if (i >= lines.length) return { value: null, next: i };

    const first = lines[i];
    const firstIndent = first.match(/^\s*/)[0].length;
    if (firstIndent < indent) return { value: null, next: i };
    if (firstIndent > indent) {
      throw new Error(`Invalid indentation at line ${i + 1} in ${filePath}`);
    }

    const isArray = first.trim().startsWith("- ");
    if (isArray) {
      const arr = [];
      while (i < lines.length) {
        i = nextMeaningfulIndex(i);
        if (i >= lines.length) break;
        const line = lines[i];
        const curIndent = line.match(/^\s*/)[0].length;
        const trimmed = line.trim();
        if (curIndent < indent) break;
        if (curIndent > indent) {
          throw new Error(
            `Unexpected indentation at line ${i + 1} in ${filePath}`,
          );
        }
        if (!trimmed.startsWith("- ")) break;

        const itemBody = trimmed.slice(2).trim();
        if (itemBody === "") {
          const nested = parseBlock(i + 1, indent + 2);
          arr.push(nested.value);
          i = nested.next;
          continue;
        }

        if (itemBody.includes(":")) {
          const idx = itemBody.indexOf(":");
          const key = itemBody.slice(0, idx).trim();
          const rawValue = itemBody.slice(idx + 1).trim();
          const obj = {};
          if (rawValue === "") {
            const nested = parseBlock(i + 1, indent + 4);
            obj[key] = nested.value;
            i = nested.next;
          } else {
            obj[key] = parseScalar(rawValue);
            i += 1;
          }

          while (i < lines.length) {
            i = nextMeaningfulIndex(i);
            if (i >= lines.length) break;
            const extLine = lines[i];
            const extIndent = extLine.match(/^\s*/)[0].length;
            const extTrim = extLine.trim();
            if (extIndent < indent + 2) break;
            if (extIndent === indent && extTrim.startsWith("- ")) break;
            if (extIndent !== indent + 2) {
              throw new Error(
                `Invalid object indentation at line ${i + 1} in ${filePath}`,
              );
            }
            const extIdx = extTrim.indexOf(":");
            if (extIdx < 1) {
              throw new Error(
                `Expected key: value at line ${i + 1} in ${filePath}`,
              );
            }
            const extKey = extTrim.slice(0, extIdx).trim();
            const extRaw = extTrim.slice(extIdx + 1).trim();
            if (extRaw === "") {
              const nested = parseBlock(i + 1, extIndent + 2);
              obj[extKey] = nested.value;
              i = nested.next;
            } else {
              obj[extKey] = parseScalar(extRaw);
              i += 1;
            }
          }
          arr.push(obj);
          continue;
        }

        arr.push(parseScalar(itemBody));
        i += 1;
      }
      return { value: arr, next: i };
    }

    const obj = {};
    while (i < lines.length) {
      i = nextMeaningfulIndex(i);
      if (i >= lines.length) break;
      const line = lines[i];
      const curIndent = line.match(/^\s*/)[0].length;
      if (curIndent < indent) break;
      if (curIndent > indent) {
        throw new Error(
          `Unexpected indentation at line ${i + 1} in ${filePath}`,
        );
      }
      const trimmed = line.trim();
      const idx = trimmed.indexOf(":");
      if (idx < 1) {
        throw new Error(`Expected key: value at line ${i + 1} in ${filePath}`);
      }
      const key = trimmed.slice(0, idx).trim();
      const rawValue = trimmed.slice(idx + 1).trim();
      if (rawValue === "") {
        const nested = parseBlock(i + 1, indent + 2);
        obj[key] = nested.value;
        i = nested.next;
      } else {
        obj[key] = parseScalar(rawValue);
        i += 1;
      }
    }
    return { value: obj, next: i };
  }

  return parseBlock(0, 0).value;
}

function loadYaml(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return parseYamlLike(raw, filePath);
}

function toList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function validateMeta(metaPath, meta, registries, errors, seenIds) {
  const relMetaPath = path.relative(repoRoot, metaPath);
  const sourcePath = metaPath.replace(/\.meta\.yaml$/, ".md");
  const relSourcePath = path.relative(repoRoot, sourcePath);

  if (!fs.existsSync(sourcePath)) {
    errors.push(
      `${relMetaPath}: missing source markdown file ${relSourcePath}`,
    );
  }

  const required = [
    "id",
    "title",
    "doc_type",
    "category",
    "priority",
    "status",
    "created",
    "updated",
    "version",
    "changelog",
  ];
  for (const key of required) {
    if (!(key in meta)) {
      errors.push(`${relMetaPath}: missing required field '${key}'`);
    }
  }

  if (meta.id && !idPattern.test(meta.id)) {
    errors.push(`${relMetaPath}: id '${meta.id}' must match ${idPattern}`);
  }

  if (meta.id) {
    if (seenIds.has(meta.id)) {
      errors.push(
        `${relMetaPath}: duplicate id '${meta.id}' (also used in ${seenIds.get(meta.id)})`,
      );
    } else {
      seenIds.set(meta.id, relMetaPath);
    }
  }

  if (meta.category && !registries.categoryIds.has(meta.category)) {
    errors.push(
      `${relMetaPath}: category '${meta.category}' is not defined in specs/_registry/categories.yaml`,
    );
  }

  if (meta.priority && !registries.priorityIds.has(meta.priority)) {
    errors.push(
      `${relMetaPath}: priority '${meta.priority}' is not defined in specs/_registry/priorities.yaml`,
    );
  }

  if (meta.status && !registries.statusIds.has(meta.status)) {
    errors.push(
      `${relMetaPath}: status '${meta.status}' is not defined in specs/_registry/statuses.yaml`,
    );
  }

  if (meta.created && !isDateString(meta.created)) {
    errors.push(
      `${relMetaPath}: created '${meta.created}' must be a valid ISO date YYYY-MM-DD`,
    );
  }

  if (meta.updated && !isDateString(meta.updated)) {
    errors.push(
      `${relMetaPath}: updated '${meta.updated}' must be a valid ISO date YYYY-MM-DD`,
    );
  }

  if (
    meta.version &&
    (typeof meta.version !== "string" || !semverPattern.test(meta.version))
  ) {
    errors.push(
      `${relMetaPath}: version '${meta.version}' must be semantic versioning (e.g. 1.0.0)`,
    );
  }

  if (
    !Array.isArray(meta.changelog) ||
    meta.changelog.length === 0 ||
    meta.changelog.some((v) => typeof v !== "string" || !v.trim())
  ) {
    errors.push(
      `${relMetaPath}: changelog must be a non-empty array of strings`,
    );
  }

  const relates = toList(meta.relates);
  for (const rel of relates) {
    if (typeof rel !== "string" || !rel.trim()) {
      errors.push(`${relMetaPath}: relates entries must be non-empty strings`);
      continue;
    }
    const target = path.resolve(repoRoot, rel);
    if (!fs.existsSync(target)) {
      errors.push(`${relMetaPath}: relates path does not exist: ${rel}`);
    }
  }
}

function loadRegistries() {
  const categories = loadYaml(
    path.join(repoRoot, "specs/_registry/categories.yaml"),
  );
  const priorities = loadYaml(
    path.join(repoRoot, "specs/_registry/priorities.yaml"),
  );
  const statuses = loadYaml(
    path.join(repoRoot, "specs/_registry/statuses.yaml"),
  );

  const toIdSet = (items, name) => {
    if (!Array.isArray(items)) throw new Error(`${name} must be a YAML array`);
    const ids = new Set();
    for (const item of items) {
      if (!item || typeof item !== "object" || typeof item.id !== "string") {
        throw new Error(`${name} entries must be objects with string id`);
      }
      ids.add(item.id);
    }
    return ids;
  };

  return {
    categoryIds: toIdSet(categories, "categories"),
    priorityIds: toIdSet(priorities, "priorities"),
    statusIds: toIdSet(statuses, "statuses"),
  };
}

function main() {
  const files = walk(repoRoot);
  const metaFiles = files
    .filter((f) => f.endsWith(".meta.yaml"))
    .filter((f) => !f.includes(`${path.sep}.git${path.sep}`));

  const errors = [];
  const seenIds = new Map();
  const registries = loadRegistries();

  for (const metaPath of metaFiles) {
    let meta;
    try {
      meta = loadYaml(metaPath);
    } catch (err) {
      errors.push(
        `${path.relative(repoRoot, metaPath)}: invalid YAML (${err.message})`,
      );
      continue;
    }
    if (!meta || Array.isArray(meta) || typeof meta !== "object") {
      errors.push(
        `${path.relative(repoRoot, metaPath)}: root must be a mapping/object`,
      );
      continue;
    }
    validateMeta(metaPath, meta, registries, errors, seenIds);
  }

  if (errors.length > 0) {
    console.error(`Metadata validation failed with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }

  console.log(`Metadata validation passed for ${metaFiles.length} file(s).`);
}

main();
