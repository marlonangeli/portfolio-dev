# Curriculum Validation and Export

Curriculum files are validated with Bun scripts and custom rules.

## Commands

```bash
bun run curriculum:validate
bun run curriculum:export
bun run json:validate
bun run yaml:validate
```

## What Validation Covers

- required fields in `curriculum/cv.yaml` and section files
- date formats (`YYYY-MM-DD` and `YYYY-MM`)
- enum values from `curriculum/_registry/enums.yaml`
- duplicate IDs
- cross-file references (`links`, `skills.references`)
- URL format and HTTPS requirement
- locale map completeness (`pt-BR` required, `en` warnings)
- translatable field compatibility (`string` or locale map)
- URL or link-id fields for company/institution websites

## Export Output

`bun run curriculum:export` writes:

- `dist/cv.resume.json`

The exported file uses a custom curriculum shape with top-level `profile`, `work`, `education`, `skills`, `projects`, and `languages`, plus extension fields under `x_portfolio`.

## CI Integration

Use these commands in CI:

```bash
bun run json:validate
bun run yaml:validate
bun run meta:validate
bun run curriculum:validate
```
