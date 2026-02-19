# Specs Index

This is the canonical index for repository specs and requirement-related documentation.

## Structure

- `specs/_registry/`: source of truth for category/priority/status IDs.
- `specs/templates/`: Markdown templates for requirements, tasks, and skills.
- `tasks/`: extracted TODO/REVIEW/FIX work items that require tracking.
- `.ai/skills/`: local AI skill notes.
- `curriculum/`: CV data model rooted at `curriculum/cv.yaml`.

## Rules

- Metadata lives in sidecar files (`*.meta.yaml`) next to each Markdown file.
- Always update `updated` to the current date when editing metadata.
- Use only IDs from `specs/_registry/*.yaml` for `category`, `priority`, and `status`.
- Keep changelog entries concise and append-only.
- Keep docs in English, while preserving future `pt-BR` support through metadata (`i18n`).

## References

- Typed metadata guide: `specs/02-typed-metadata.md`
- Curriculum data model: `specs/03-curriculum-data-model.md`
- Curriculum validation and export: `specs/04-curriculum-validation.md`
- Requirement template: `specs/templates/requirement.md`
- Task template: `specs/templates/task.md`
- Skill template: `specs/templates/skill.md`
- Task extracted from previous TODO: `tasks/2026-02-18-specification-flow-reference.md`
