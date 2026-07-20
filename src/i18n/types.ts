export const APP_LOCALES = ['vi', 'en'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = 'vi';
export const DEVELOPMENT_FALLBACK_LOCALE: AppLocale = 'en';

export interface LocalizedString {
  readonly vi: string;
  readonly en: string;
}

export function localized(vi: string, en: string): LocalizedString {
  return Object.freeze({ vi, en });
}

export function normalizeAppLocale(locale?: string | null): AppLocale {
  const language = locale?.trim().toLowerCase().split(/[-_]/u)[0];

  if (language === 'vi' || language === 'en') {
    return language;
  }

  return DEFAULT_APP_LOCALE;
}

export function localize(value: LocalizedString, locale?: string | null): string {
  const normalizedLocale = normalizeAppLocale(locale);
  const translated = value[normalizedLocale].trim();

  return translated || value[DEVELOPMENT_FALLBACK_LOCALE];
}
