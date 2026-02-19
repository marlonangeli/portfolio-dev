import { LOCALE_REGEX } from "../../src/contracts/common.ts";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isTranslatableObject(value: unknown): value is Record<string, string> {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every(
    (key) =>
      LOCALE_REGEX.test(key) && typeof value[key] === "string" && value[key].trim().length > 0,
  );
}

export function readTranslatable(value: unknown, locale: string, fallbackLocale = "pt-BR"): string {
  if (typeof value === "string") return value;
  if (!isTranslatableObject(value)) return "";
  if (value[locale]) return value[locale];
  if (value[fallbackLocale]) return value[fallbackLocale];
  const first = Object.values(value).find(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
  return first ?? "";
}

export function looksLikeHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
