# Portfolio

Marlon Angeli dev portfolio.

---

## Status

- [x] Typed metadata categories/priorities with autocomplete and validation.
- [x] Renamed templates location to `specs/templates` (legacy `docs/` removed).
- [x] Moved skills to `.ai/skills`.
- [x] Added Bun CLI scaffolding for requirements/tasks/skills.
- [x] Added curriculum model rooted at `curriculum/cv.yaml` with validation/export scripts.
- [ ] Create additional workflow skills (`workflow`, `worktree`) as dedicated files.
- [ ] Configure environment (`bun`, `mise`, `justfile`, `.editorconfig`, lint/LSP, deploy target).

## Metadata Workflow

- Source of truth: TypeScript + Zod contracts in `src/contracts/`
- Generated metadata schema: `schemas/generated/meta.schema.json`
- Validator: `scripts/validate-meta.ts`
- Generator: `scripts/new.ts`
- Schema generation: `bun run schema:generate`
- Run validation: `bun run meta:validate`
- Run typecheck: `bun run typecheck`
- Run lint: `bun run lint`
- Run tests: `bun test`
- Create docs: `bun run new --type requirement|task|skill --title "..."`
- Guide: `specs/02-typed-metadata.md`

## Toolchain (mise)

- Repo tool versions are pinned in `.mise.toml` (currently `bun = 1.3.5`).
- Install/use with:
  - `mise trust`
  - `mise install`
  - `mise exec -- bun --version`
  - `mise exec -- bun run validate`
  - `mise exec -- bun test`

## Curriculum Workflow

- Canonical root: `curriculum/cv.yaml`
- Source of truth: TypeScript + Zod contracts in `src/contracts/curriculum.ts`
- Generated section schemas: `schemas/generated/curriculum/*.schema.json`
- Validate curriculum: `bun run curriculum:validate`
- Export JSON Resume: `bun run curriculum:export`
- Validate JSON files: `bun run json:validate`
- Validate YAML files: `bun run yaml:validate`
- Run full validation suite: `bun run validate`
- Test helpers/parsers: `bun test`
- Data model docs: `specs/03-curriculum-data-model.md`
- Validation docs: `specs/04-curriculum-validation.md`

## Categories

Current IDs are defined in `specs/_registry/categories.yaml`.

## Priorities

Current IDs and ranks are defined in `specs/_registry/priorities.yaml`.
