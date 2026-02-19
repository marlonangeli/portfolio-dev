# Typed Metadata Workflow

This repository uses sidecar metadata files (`*.meta.yaml`) to provide strong typing, autocomplete, and validation for documentation assets.

## Metadata Model

Each Markdown doc has a sibling metadata file.

Example:

- `specs/00-index.md`
- `specs/00-index.meta.yaml`

Required metadata fields:

- `id`: stable unique identifier.
- `title`: human-readable title.
- `doc_type`: `index|spec|requirement|task|skill|guide|template`.
- `category`: must exist in `specs/_registry/categories.yaml`.
- `priority`: must exist in `specs/_registry/priorities.yaml`.
- `status`: must exist in `specs/_registry/statuses.yaml`.
- `created`, `updated`: ISO date `YYYY-MM-DD`.
- `version`: semantic version (`x.y.z`).
- `changelog`: list of short change entries.

Optional metadata fields:

- `language`: primary language code (e.g. `en`).
- `i18n`: supported locales list (e.g. `en`, `pt-BR`).
- `relates`: related file paths in repository.

## Registries

Central registries live in `specs/_registry/`:

- `categories.yaml`
- `priorities.yaml`
- `statuses.yaml`

## Validation

Run local validation:

```bash
bun run meta:validate
```

Validation checks:

- required fields and type shape
- enum membership against registries
- date and semver formats
- duplicate metadata IDs
- `relates` paths exist
- sidecar has a sibling Markdown source file

## CLI Generation

Create new requirement/task/skill files with metadata using Bun:

```bash
bun run new --type requirement --title "Requirement title"
bun run new --type task --title "Task title"
bun run new --type skill --title "Skill title"
```

Example linking a new requirement to an existing task:

```bash
bun run new --type requirement \
  --title "Define taxonomy for curriculum images" \
  --for-task tasks/2026-02-18-specification-flow-reference.md
```

This command writes:

- a Markdown file from templates
- a `.meta.yaml` sidecar with typed fields
- and (when `--for-task` is used) updates the task metadata `relates` list as well

## Zed Autocomplete

`.zed/settings.json` maps `schemas/meta.schema.json` to all `**/*.meta.yaml` files.

This enables autocomplete and inline diagnostics in Zed via YAML language server.

## Naming Conventions

- Use lowercase IDs with `-`, `_`, or `.`.
- Keep metadata in YAML with 2-space indentation.
- Use repository-relative paths in `relates`.
- Prefer concise changelog lines in imperative past tense.
