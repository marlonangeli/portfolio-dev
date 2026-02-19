import { z } from "zod";
import {
  IdSchema,
  IsoDateSchema,
  NonEmptyStringSchema,
  SEMVER_REGEX,
  TranslatableTextSchema,
  YearMonthSchema,
} from "./common.ts";

export const PROFILE_MODES = ["public", "private"] as const;
export const WORK_MODE_VALUES = ["remote", "hybrid", "on-site"] as const;
export const LANGUAGE_LEVEL_VALUES = ["native", "c2", "c1", "b2", "b1", "a2", "a1"] as const;
export const SKILL_LEVEL_VALUES = ["beginner", "intermediate", "advanced", "expert"] as const;
export const EDUCATION_STATUS_VALUES = ["in-progress", "completed", "paused"] as const;
export const LINK_KIND_VALUES = [
  "portfolio",
  "github",
  "linkedin",
  "company",
  "repo",
  "article",
  "certificate",
  "talk",
  "demo",
  "contact",
] as const;

export const CurriculumRootSchema = z.object({
  id: IdSchema,
  schema_version: z.string().regex(SEMVER_REGEX),
  default_locale: NonEmptyStringSchema,
  supported_locales: z.array(NonEmptyStringSchema).min(1),
  profile_mode: z.enum(PROFILE_MODES),
  updated: IsoDateSchema,
  sections: z.object({
    profile: NonEmptyStringSchema,
    summary: NonEmptyStringSchema,
    experience: NonEmptyStringSchema,
    projects: NonEmptyStringSchema,
    education: NonEmptyStringSchema,
    skills: NonEmptyStringSchema,
    languages: NonEmptyStringSchema,
    links: NonEmptyStringSchema,
  }),
  exports: z.object({
    json_resume: z.boolean(),
    json_resume_path: NonEmptyStringSchema.optional(),
  }),
});

export const CurriculumLinkSchema = z.object({
  id: IdSchema,
  kind: z.enum(LINK_KIND_VALUES),
  url: z.string().url().startsWith("https://"),
  label: TranslatableTextSchema,
  visibility: z.enum(["public", "private"]),
});

export const CurriculumLinksSchema = z.object({
  links: z.array(CurriculumLinkSchema),
});

export const CurriculumProfileSchema = z.object({
  profile: z.object({
    id: IdSchema,
    name: TranslatableTextSchema,
    title: TranslatableTextSchema,
    location: z.object({
      country_code: z.string().regex(/^[A-Z]{2}$/),
      region: TranslatableTextSchema,
    }),
    contact: z.object({
      email: NonEmptyStringSchema,
      picture_url: z.string().url().startsWith("https://").optional(),
    }),
    links: z.array(IdSchema),
    availability: z.object({
      work_model: z.array(z.enum(WORK_MODE_VALUES)).min(1),
    }),
  }),
});

export const CurriculumSummarySchema = z.object({
  summary: z.object({
    id: IdSchema,
    professional_summary: TranslatableTextSchema,
    objective: TranslatableTextSchema,
  }),
});

export const CurriculumExperienceItemSchema = z.object({
  id: IdSchema,
  company: z.object({
    name: TranslatableTextSchema,
    website: NonEmptyStringSchema,
  }),
  role: TranslatableTextSchema,
  start: YearMonthSchema,
  end: z.union([YearMonthSchema, z.literal("present")]),
  achievements: z.array(TranslatableTextSchema).optional(),
  related_links: z.array(IdSchema).optional(),
  technologies: z.array(NonEmptyStringSchema).optional(),
});

export const CurriculumExperienceSchema = z.object({
  experience: z.array(CurriculumExperienceItemSchema),
});

export const CurriculumProjectsSchema = z.object({
  projects: z.array(
    z.object({
      id: IdSchema,
      name: TranslatableTextSchema,
      description: TranslatableTextSchema,
      links: z.array(IdSchema),
      technologies: z.array(NonEmptyStringSchema).optional(),
    }),
  ),
});

export const CurriculumEducationSchema = z.object({
  education: z.array(
    z.object({
      id: IdSchema,
      institution: z.object({
        name: TranslatableTextSchema,
        short_name: NonEmptyStringSchema.optional(),
        website: NonEmptyStringSchema,
      }),
      degree: TranslatableTextSchema,
      study_type: TranslatableTextSchema.optional(),
      start: YearMonthSchema,
      end: z.union([YearMonthSchema, z.literal("present")]),
      status: z.enum(EDUCATION_STATUS_VALUES),
    }),
  ),
});

export const CurriculumSkillsSchema = z.object({
  skills: z.array(
    z.object({
      id: IdSchema,
      name: TranslatableTextSchema,
      level: z.enum(SKILL_LEVEL_VALUES),
      category: NonEmptyStringSchema,
      references: z.array(IdSchema).optional(),
    }),
  ),
});

export const CurriculumLanguagesSchema = z.object({
  languages: z.array(
    z.object({
      id: IdSchema,
      code: NonEmptyStringSchema,
      name: TranslatableTextSchema,
      level: z.enum(LANGUAGE_LEVEL_VALUES),
      certificate_link: z.string().url().startsWith("https://").optional(),
    }),
  ),
});

export type CurriculumRoot = z.infer<typeof CurriculumRootSchema>;
export type CurriculumLinks = z.infer<typeof CurriculumLinksSchema>;
export type CurriculumProfile = z.infer<typeof CurriculumProfileSchema>;
export type CurriculumSummary = z.infer<typeof CurriculumSummarySchema>;
export type CurriculumExperience = z.infer<typeof CurriculumExperienceSchema>;
export type CurriculumProjects = z.infer<typeof CurriculumProjectsSchema>;
export type CurriculumEducation = z.infer<typeof CurriculumEducationSchema>;
export type CurriculumSkills = z.infer<typeof CurriculumSkillsSchema>;
export type CurriculumLanguages = z.infer<typeof CurriculumLanguagesSchema>;
