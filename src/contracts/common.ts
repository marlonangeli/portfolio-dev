import { z } from "zod";

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const YEAR_MONTH_REGEX = /^\d{4}-\d{2}$/;
export const ID_REGEX = /^[a-z0-9][a-z0-9._-]*$/;
export const LOCALE_REGEX = /^[a-z]{2}(?:-[A-Z]{2})?$/;
export const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const IdSchema = z.string().regex(ID_REGEX);

export const NonEmptyStringSchema = z.string().trim().min(1);

export const LocaleMapSchema = z
  .record(z.string(), NonEmptyStringSchema)
  .refine((value) => Object.keys(value).length > 0, {
    message: "Locale map must not be empty",
  })
  .refine((value) => Object.keys(value).every((key) => LOCALE_REGEX.test(key)), {
    message: "Locale map has invalid locale keys",
  })
  .refine((value) => typeof value["pt-BR"] === "string" && value["pt-BR"].trim().length > 0, {
    message: "Locale map requires pt-BR when object form is used",
  });

export const TranslatableTextSchema = z.union([NonEmptyStringSchema, LocaleMapSchema]);

export const IsoDateSchema = z.string().regex(ISO_DATE_REGEX);
export const YearMonthSchema = z.string().regex(YEAR_MONTH_REGEX);

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function isValidYearMonth(value: string): boolean {
  if (!YEAR_MONTH_REGEX.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  if (year === undefined || month === undefined) return false;
  return year >= 1900 && year <= 2999 && month >= 1 && month <= 12;
}

export function compareYearMonth(a: string, b: string): number {
  return a.localeCompare(b);
}
