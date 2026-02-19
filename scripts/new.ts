#!/usr/bin/env bun
import fs from "fs";
import path from "path";
import { META_CATEGORIES, META_PRIORITIES, META_STATUSES } from "../src/contracts/meta.ts";
import { loadYamlFile, saveYamlFile } from "./lib/yaml-lite.ts";

const repoRoot = process.cwd();
const TODAY = new Date().toISOString().slice(0, 10);

type ArgMap = Record<string, string | boolean>;

type MetaObject = {
  id: string;
  title: string;
  doc_type: string;
  category: string;
  priority: string;
  status: string;
  created: string;
  updated: string;
  version: string;
  language: string;
  i18n: string[];
  relates: string[];
  changelog: string[];
};

function usage(): void {
  console.log(`Usage:
  bun run new --type <requirement|task|skill> --title "Title" [options]

Options:
  --category <id>       Category id (${META_CATEGORIES.join(", ")})
  --priority <id>       Priority id (${META_PRIORITIES.join(", ")})
  --status <id>         Status id (${META_STATUSES.join(", ")})
  --relates <a,b,c>     Comma-separated repository-relative paths
  --for-task <path>     When type=requirement, bi-directionally relate to this task
  --locale <en|pt-BR>   Language value for metadata (default: en)
  --dry-run             Print changes without writing files
`);
}

function parseArgs(argv: string[]): ArgMap {
  const args: ArgMap = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (!token.startsWith("--")) continue;

    const [key, inlineValue] = token.split("=");
    if (!key) continue;
    if (inlineValue !== undefined) {
      args[key.slice(2)] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = next;
      index += 1;
    }
  }
  return args;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function nextSpecNumber(): string {
  const specsDir = path.join(repoRoot, "specs");
  const files = fs.existsSync(specsDir) ? fs.readdirSync(specsDir) : [];
  let max = 0;
  for (const file of files) {
    const match = file.match(/^(\d{2})-.*\.md$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return String(max + 1).padStart(2, "0");
}

function ensureUniqueMetaId(baseId: string): string {
  const seen = new Set<string>();

  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".meta.yaml")) {
        try {
          const meta = loadYamlFile(full) as { id?: unknown } | null;
          if (meta && typeof meta === "object" && typeof meta.id === "string") seen.add(meta.id);
        } catch {
          // ignore broken metadata here; validator handles it
        }
      }
    }
  };

  walk(repoRoot);
  if (!seen.has(baseId)) return baseId;

  let suffix = 2;
  while (seen.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

function renderMarkdown(templatePath: string, title: string): string {
  const raw = fs.readFileSync(templatePath, "utf8");
  return raw.replace(/^#\s+.+/m, `# ${title}`);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function appendChangelog(meta: Record<string, unknown>, entry: string): void {
  const existing = Array.isArray(meta.changelog)
    ? meta.changelog.filter((item): item is string => typeof item === "string")
    : [];
  meta.changelog = [...existing, entry];
}

function assertString(value: string | boolean | undefined, flag: string): string {
  if (typeof value === "string") return value;
  console.error(`Missing required ${flag}`);
  process.exit(1);
}

if (import.meta.main) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }

  const type = assertString(args.type, "--type");
  const title = assertString(args.title, "--title");

  if (!["requirement", "task", "skill"].includes(type)) {
    console.error(`Invalid --type '${type}'. Expected requirement|task|skill.`);
    process.exit(1);
  }

  const defaultCategory =
    type === "requirement" ? "documentation" : type === "task" ? "workflow" : "ai";

  const category = typeof args.category === "string" ? args.category : defaultCategory;
  const priority = typeof args.priority === "string" ? args.priority : "medium";
  const status = typeof args.status === "string" ? args.status : "draft";

  if (!META_CATEGORIES.includes(category as (typeof META_CATEGORIES)[number])) {
    console.error(`Invalid --category '${category}'.`);
    process.exit(1);
  }
  if (!META_PRIORITIES.includes(priority as (typeof META_PRIORITIES)[number])) {
    console.error(`Invalid --priority '${priority}'.`);
    process.exit(1);
  }
  if (!META_STATUSES.includes(status as (typeof META_STATUSES)[number])) {
    console.error(`Invalid --status '${status}'.`);
    process.exit(1);
  }

  const locale = typeof args.locale === "string" ? args.locale : "en";
  if (!["en", "pt-BR"].includes(locale)) {
    console.error(`Invalid --locale '${locale}'. Use en or pt-BR.`);
    process.exit(1);
  }

  const slug = slugify(title);
  if (!slug) {
    console.error("Title produced an empty slug. Use a title with letters/numbers.");
    process.exit(1);
  }

  const basePath =
    type === "requirement"
      ? `specs/${nextSpecNumber()}-${slug}`
      : type === "task"
        ? `tasks/${TODAY}-${slug}`
        : `.ai/skills/${slug}`;

  const template =
    type === "requirement"
      ? "specs/templates/requirement.md"
      : type === "task"
        ? "specs/templates/task.md"
        : "specs/templates/skill.md";

  const mdPath = `${basePath}.md`;
  const metaPath = `${basePath}.meta.yaml`;
  const relates = toList(args.relates);

  if (type === "requirement" && typeof args["for-task"] === "string") {
    relates.push(args["for-task"]);
  }

  if (fs.existsSync(path.join(repoRoot, mdPath)) || fs.existsSync(path.join(repoRoot, metaPath))) {
    console.error(`Target file already exists: ${mdPath} or ${metaPath}`);
    process.exit(1);
  }

  const meta: MetaObject = {
    id: ensureUniqueMetaId(`${type}-${slug}`),
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

  const writes: Array<{ file: string; content?: string; meta?: Record<string, unknown> }> = [
    {
      file: mdPath,
      content: `${renderMarkdown(path.join(repoRoot, template), title).trimEnd()}\n`,
    },
    { file: metaPath, meta },
  ];

  if (type === "requirement" && typeof args["for-task"] === "string") {
    const taskPath = args["for-task"];
    const taskMetaPath = taskPath.replace(/\.md$/, ".meta.yaml");
    const absTaskMeta = path.join(repoRoot, taskMetaPath);

    if (!fs.existsSync(path.join(repoRoot, taskPath)) || !fs.existsSync(absTaskMeta)) {
      console.error(`--for-task requires existing task markdown and metadata: ${taskPath}`);
      process.exit(1);
    }

    const taskMeta = (loadYamlFile(absTaskMeta) ?? {}) as Record<string, unknown>;
    const currentRelates = Array.isArray(taskMeta.relates)
      ? taskMeta.relates.filter((item): item is string => typeof item === "string")
      : [];

    taskMeta.relates = uniqueSorted([...currentRelates, mdPath]);
    taskMeta.updated = TODAY;
    appendChangelog(taskMeta, `Related requirement added: ${mdPath}`);

    writes.push({ file: taskMetaPath, meta: taskMeta });
  }

  if (args["dry-run"]) {
    console.log("Dry run - planned writes:");
    for (const write of writes) console.log(`- ${write.file}`);
    process.exit(0);
  }

  for (const write of writes) {
    const abs = path.join(repoRoot, write.file);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (typeof write.content === "string") {
      fs.writeFileSync(abs, write.content, "utf8");
    } else if (write.meta) {
      saveYamlFile(abs, write.meta);
    }
  }

  console.log(`Created ${mdPath}`);
  console.log(`Created ${metaPath}`);
  if (type === "requirement" && typeof args["for-task"] === "string") {
    console.log(`Updated ${args["for-task"].replace(/\.md$/, ".meta.yaml")}`);
  }
}
