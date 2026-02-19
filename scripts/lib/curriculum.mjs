const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isLocaleKey(value) {
  return typeof value === 'string' && localePattern.test(value);
}

export function isTranslatableObject(value) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every((key) => isLocaleKey(key) && typeof value[key] === 'string');
}

export function readTranslatable(value, locale, fallbackLocale = 'pt-BR') {
  if (typeof value === 'string') return value;
  if (!isTranslatableObject(value)) return '';
  if (value[locale]) return value[locale];
  if (value[fallbackLocale]) return value[fallbackLocale];
  const first = Object.values(value).find((item) => typeof item === 'string' && item.trim());
  return first || '';
}

export function validateTranslatable(value, fieldName, errors, warnings, options = {}) {
  const {
    requiredLocale = 'pt-BR',
    warnForEnglish = true,
    allowString = true,
  } = options;

  if (allowString && typeof value === 'string') {
    if (!value.trim()) {
      errors.push(`${fieldName} must not be an empty string`);
    }
    return;
  }

  if (!isPlainObject(value) || Array.isArray(value)) {
    errors.push(`${fieldName} must be a string or a locale map object`);
    return;
  }

  const locales = Object.keys(value);
  if (locales.length === 0) {
    errors.push(`${fieldName} locale map must not be empty`);
    return;
  }

  for (const locale of locales) {
    if (!isLocaleKey(locale)) {
      errors.push(`${fieldName} has invalid locale key '${locale}'`);
      continue;
    }
    if (typeof value[locale] !== 'string' || !value[locale].trim()) {
      errors.push(`${fieldName}.${locale} must be a non-empty string`);
    }
  }

  if (!(requiredLocale in value) || typeof value[requiredLocale] !== 'string' || !value[requiredLocale].trim()) {
    errors.push(`${fieldName}.${requiredLocale} is required when using a locale map`);
  }

  if (warnForEnglish && (!('en' in value) || typeof value.en !== 'string' || !value.en.trim())) {
    warnings.push(`${fieldName}.en is missing or empty`);
  }
}

export function looksLikeHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
