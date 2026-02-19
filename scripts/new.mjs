#!/usr/bin/env bun
import fs from "fs";
import path from "path";
import { loadYamlFile, saveYamlFile } from "./lib/yaml-lite.mjs";

const repoRoot = process.cwd();
const TODAY = new Date().toISOString().slice(0, 10);

function usage() {
  console.log(`Usage:
  bun run new --type <requirement|task|skill> --title "Title" [options]

Options:
  --category <id>       Category id from specs/_registry/categories.yaml
  --priority <id>       Priority id from specs/_registry/priorities.yaml
  --status <id>         Status id from specs/_registry/statuses.yaml (default: draft)
  --relates <a,b,c>     Comma-separated repository-relative paths
  --for-task <path>     When type=requirement, bi-directionally relate to this task
  --locale <en|pt-BR>   Language value for metadata (default: en)
  --dry-run             Print changes without writing files
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const [key, inlineValue] = token.split("=");
    if (inlineValue !== undefined) {
      args[key.slice(2)] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = next;
      i += 1;
    }
  }
  return args;
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function loadRegistryIds(file) {
  return new Set(
    (loadYamlFile(path.join(repoRoot, file)) || []).map((item) => item.id),
  );
}

function nextSpecNumber() {
  const files = fs.existsSync(path.join(repoRoot, "specs"))
    ? fs.readdirSync(path.join(repoRoot, "specs"))
    : [];
  let max = 0;
  for (const f of files) {
    const m = f.match(/^(\d{2})-.*\.md$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return String(max + 1).padStart(2, "0");
}

function ensureUniqueMetaId(baseId) {
  const seen = new Set();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".meta.yaml")) {
        try {
          const meta = loadYamlFile(full);
          if (meta?.id) seen.add(meta.id);
        } catch {
          // Ignore unreadable files here; validator will report separately.
        }
      }
    }
  }
  walk(repoRoot);
  if (!seen.has(baseId)) return baseId;
  let i = 2;
  while (seen.has(`${baseId}-${i}`)) i += 1;
  return `${baseId}-${i}`;
}

function renderMarkdown(templatePath, title) {
  const raw = fs.readFileSync(templatePath, "utf8");
  return raw.replace(/^#\s+.+/m, `# ${title}`);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function appendChangelog(meta, entry) {
  const changelog = Array.isArray(meta.changelog) ? meta.changelog : [];
  meta.changelog = [...changelog, entry];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }

  const type = args.type;
  const title = args.title;

  if (!type || !title) {
    usage();
    process.exit(1);
  }

  const validTypes = new Set(["requirement", "task", "skill"]);
  if (!validTypes.has(type)) {
    console.error(`Invalid --type '${type}'. Expected requirement|task|skill.`);
    process.exit(1);
  }

  const categories = loadRegistryIds("specs/_registry/categories.yaml");
  const priorities = loadRegistryIds("specs/_registry/priorities.yaml");
  const statuses = loadRegistryIds("specs/_registry/statuses.yaml");

  const defaultCategory =
    type === "requirement"
      ? "documentation"
      : type === "task"
        ? "workflow"
        : "ai";
  const category = args.category || defaultCategory;
  const priority = args.priority || "medium";
  const status = args.status || "draft";

  if (!categories.has(category)) {
    console.error(`Invalid --category '${category}'.`);
    process.exit(1);
  }
  if (!priorities.has(priority)) {
    console.error(`Invalid --priority '${priority}'.`);
    process.exit(1);
  }
  if (!statuses.has(status)) {
    console.error(`Invalid --status '${status}'.`);
    process.exit(1);
  }

  const locale = args.locale || "en";
  if (!["en", "pt-BR"].includes(locale)) {
    console.error(`Invalid --locale '${locale}'. Use en or pt-BR.`);
    process.exit(1);
  }

  const slug = slugify(title);
  if (!slug) {
    console.error(
      "Title produced an empty slug. Use a title with letters/numbers.",
    );
    process.exit(1);
  }

  let basePath;
  let template;

  if (type === "requirement") {
    basePath = `specs/${nextSpecNumber()}-${slug}`;
    template = "specs/templates/requirement.md";
  } else if (type === "task") {
    basePath = `tasks/${TODAY}-${slug}`;
    template = "specs/templates/task.md";
  } else {
    basePath = `.ai/skills/${slug}`;
    template = "specs/templates/skill.md";
  }

  const mdPath = `${basePath}.md`;
  const metaPath = `${basePath}.meta.yaml`;
  const relates = toList(args.relates);

  if (type === "requirement" && args["for-task"]) {
    relates.push(args["for-task"]);
  }

  if (
    fs.existsSync(path.join(repoRoot, mdPath)) ||
    fs.existsSync(path.join(repoRoot, metaPath))
  ) {
    console.error(`Target file already exists: ${mdPath} or ${metaPath}`);
    process.exit(1);
  }

  const metaId = ensureUniqueMetaId(`${type}-${slug}`);
  const meta = {
    id: metaId,
    title,
    doc_type: type,
    category,
    priority,
    status,
    created: TODAY,
    updated: TODAY,
    version: "1.0.0",
    language: locale,
    i18n: ["en", "pt-BR"],
    relates: uniqueSorted(relates),
    changelog: ["Created via bun run new."],
  };

  const dryRun = Boolean(args["dry-run"]);
  const mdContent = renderMarkdown(path.join(repoRoot, template), title);

  const writes = [
    { file: mdPath, content: `${mdContent.trimEnd()}\n` },
    { file: metaPath, meta },
  ];

  if (type === "requirement" && args["for-task"]) {
    const taskPath = args["for-task"];
    const taskMetaPath = taskPath.replace(/\.md$/, ".meta.yaml");
    const absTaskMeta = path.join(repoRoot, taskMetaPath);
    if (
      !fs.existsSync(path.join(repoRoot, taskPath)) ||
      !fs.existsSync(absTaskMeta)
    ) {
      console.error(
        `--for-task requires existing task markdown and metadata: ${taskPath}`,
      );
      process.exit(1);
    }
    const taskMeta = loadYamlFile(absTaskMeta);
    const updatedRelates = uniqueSorted([
      ...(Array.isArray(taskMeta.relates) ? taskMeta.relates : []),
      mdPath,
    ]);
    taskMeta.relates = updatedRelates;
    taskMeta.updated = TODAY;
    appendChangelog(taskMeta, `Related requirement added: ${mdPath}`);
    writes.push({ file: taskMetaPath, meta: taskMeta });
  }

  if (dryRun) {
    console.log("Dry run - planned writes:");
    for (const w of writes) console.log(`- ${w.file}`);
    process.exit(0);
  }

  for (const w of writes) {
    const abs = path.join(repoRoot, w.file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if ("content" in w) {
      fs.writeFileSync(abs, w.content, "utf8");
    } else {
      saveYamlFile(abs, w.meta);
    }
  }

  console.log(`Created ${mdPath}`);
  console.log(`Created ${metaPath}`);
  if (type === "requirement" && args["for-task"]) {
    console.log(`Updated ${args["for-task"].replace(/\.md$/, ".meta.yaml")}`);
  }
}

main();
