# Portfolio

Marlon Angeli dev portfolio.

---

## Status

- [x] Typed metadata categories/priorities with autocomplete and validation.
- [x] Renamed templates location to `specs/templates` (legacy `docs/` removed).
- [x] Moved skills to `.ai/skills`.
- [ ] Create additional workflow skills (`workflow`, `worktree`) as dedicated files.
- [ ] Configure environment (`bun`, `mise`, `justfile`, `.editorconfig`, lint/LSP, deploy target).

## Metadata Workflow

- Registry source of truth: `specs/_registry/`
- Metadata schema: `schemas/meta.schema.json`
- Validator: `scripts/validate-meta.mjs`
- Run validation: `bun run meta:validate`
- Guide: `specs/02-typed-metadata.md`

## Categories

Current IDs are defined in `specs/_registry/categories.yaml`.

## Priorities

Current IDs and ranks are defined in `specs/_registry/priorities.yaml`.
