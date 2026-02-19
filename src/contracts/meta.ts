import { z } from "zod";
import { IdSchema, IsoDateSchema, NonEmptyStringSchema, SEMVER_REGEX } from "./common.ts";

export const META_CATEGORIES = [
  "security",
  "style",
  "documentation",
  "performance",
  "versioning",
  "database",
  "development",
  "workflow",
  "ai",
] as const;

export const META_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const META_STATUSES = ["draft", "review", "approved", "deprecated"] as const;

export const MetaSchema = z.object({
  id: IdSchema,
  title: NonEmptyStringSchema,
  doc_type: NonEmptyStringSchema,
  category: z.enum(META_CATEGORIES),
  priority: z.enum(META_PRIORITIES),
  status: z.enum(META_STATUSES),
  created: IsoDateSchema,
  updated: IsoDateSchema,
  version: z.string().regex(SEMVER_REGEX),
  language: NonEmptyStringSchema.optional(),
  i18n: z.array(NonEmptyStringSchema).optional(),
  relates: z.union([NonEmptyStringSchema, z.array(NonEmptyStringSchema)]).optional(),
  changelog: z.array(NonEmptyStringSchema).min(1),
});

export type Meta = z.infer<typeof MetaSchema>;
