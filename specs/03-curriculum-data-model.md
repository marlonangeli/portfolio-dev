# Curriculum Data Model

The curriculum system uses a hybrid YAML structure rooted at `curriculum/cv.yaml`.

## Root File

`curriculum/cv.yaml` defines:

- `schema_version`
- locale defaults (`default_locale`, `supported_locales`)
- profile mode (`public` or `private`)
- section file paths
- export toggles

This root can be reused for CV rendering and image classification workflows that need the same identity/context metadata.

## Section Files

- `curriculum/profile.yaml`
- `curriculum/summary.yaml`
- `curriculum/experience.yaml`
- `curriculum/projects.yaml`
- `curriculum/education.yaml`
- `curriculum/skills.yaml`
- `curriculum/languages.yaml`
- `curriculum/links.yaml`

## i18n Rules

Translatable fields support two formats:

- single string (quick/default authoring)
- locale map object (`pt-BR` required, `en` optional but recommended)

Example:

```yaml
role: Desenvolvedor de Software
```

```yaml
role:
  pt-BR: Desenvolvedor de Software
  en: Software Developer
```

## Typed Enums

Curriculum enum values are centralized in `curriculum/_registry/enums.yaml`.

## Compatibility

The custom curriculum model exports to JSON Resume shape via `bun run curriculum:export`.
