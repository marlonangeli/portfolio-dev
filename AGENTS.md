# Repository Guidelines

## Project Structure & Module Organization
This repository is documentation-first and organized by purpose:
- `curriculum/`: structured CV data rooted at `curriculum/cv.yaml` plus split section files.
- `specs/`: planning docs, templates, registries, and metadata guides (canonical docs include `00-index.md`, `01-stack.md`, `02-typed-metadata.md`, `03-curriculum-data-model.md`, `04-curriculum-validation.md`).
- `specs/templates/`: reusable Markdown templates (`requirement.md`, `task.md`, `skill.md`).
- `specs/_registry/`: category, priority, and status registries used by metadata validation.
- `tasks/`: tracked work items extracted from TODO/REVIEW/FIX comments when they grow.
- `.ai/skills/`: AI/workflow-oriented skill notes (for example `git.md`).
- `README.md`: high-level context and pending tasks.

Keep related content grouped in the existing folders; avoid mixing templates, specs, and data files.

## Build, Test, and Development Commands
There is no formal app build pipeline yet. Use lightweight checks while editing:
- `rg --files`: list tracked content quickly.
- `rg -n "<term>" specs curriculum tasks .ai`: search for references before editing.
- `sed -n '1,120p' <file>`: inspect file snippets safely.
- `bun run meta:validate`: validate typed metadata sidecars.
- `bun run curriculum:validate`: validate curriculum model.
- `bun run curriculum:export`: export JSON Resume-compatible output.
- `bun run schema:generate`: generate JSON schemas from Zod contracts.
- `bun run json:validate`: validate JSON files.
- `bun run yaml:validate`: validate YAML files.
- `bun run validate`: run all JSON/YAML/metadata/curriculum validations.
- `bun run typecheck`: run strict TypeScript checks.
- `bun run lint`: run Biome lint checks.
- `bun test`: run Bun-native tests.
- `bun run new --type requirement|task|skill --title "..."`: scaffold docs and sidecar metadata.
- `mise trust && mise install`: trust and install repo-pinned tool versions from `.mise.toml`.
- `mise exec -- bun run validate`: run full validation with the mise-managed Bun version.
- `mise exec -- bun test`: run tests with the mise-managed Bun version.

If a runtime/tooling stack is introduced later (Bun/etc.), add project scripts and document them here.

## Coding Style & Naming Conventions
- Use Markdown for prose and YAML for structured data.
- Use sidecar metadata files (`*.meta.yaml`) next to Markdown files.
- Keep TypeScript + Zod contracts as the only typing source of truth; schemas are generated artifacts.
- Keep YAML keys lowercase with hyphenated or clear semantic names.
- For translatable curriculum fields, allow either a single string or a locale map (`pt-BR` required when using map form).
- Use 2-space indentation in YAML; do not use tabs.
- Keep filenames descriptive and consistent with existing patterns.
- For any metadata update, set `updated` to the current date (`YYYY-MM-DD`).
- Keep docs in English and preserve future i18n support via metadata locales (including `pt-BR`).

## Testing Guidelines
Automated tests are configured with Bun and should pass before submitting changes.
Before submitting changes:
- Validate YAML syntax with your editor/LSP.
- Run `bun run meta:validate`.
- Run `bun run curriculum:validate`.
- Run `bun test`.
- Check cross-file consistency (names, dates, links, and section titles).
- Review rendered Markdown for heading order and readability.

## Commit & Pull Request Guidelines
Git metadata is not available in this workspace snapshot, so use Conventional Commits going forward:
- `docs: update typed metadata guide`
- `chore: add curriculum schema and validator`

PRs should include:
- A short summary of what changed and why.
- Affected paths (for example `curriculum/cv.yaml`, `schemas/curriculum/root.schema.json`).
- Screenshots only when visual rendering is relevant.
- Linked issue/task when applicable.

## Security & Configuration Tips
Do not commit secrets, tokens, or private personal identifiers beyond intentional portfolio content. Prefer placeholders in templates and keep environment-specific settings out of this repository.
