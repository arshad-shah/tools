import type { MockLocale } from '@/shared/lib/data-formats/mock-schema';
import { deDE } from './de-DE';
import { enGB } from './en-GB';
import { enUS } from './en-US';
import { esES } from './es-ES';
import { frFR } from './fr-FR';
import type { LocaleData } from './types';

export type { LocaleData } from './types';

export const LOCALES: Record<MockLocale, LocaleData> = {
  'en-US': enUS,
  'en-GB': enGB,
  'de-DE': deDE,
  'fr-FR': frFR,
  'es-ES': esES,
};

export const LOCALE_LABEL: Record<MockLocale, string> = {
  'en-US': 'English (United States)',
  'en-GB': 'English (United Kingdom)',
  'de-DE': 'German (Germany)',
  'fr-FR': 'French (France)',
  'es-ES': 'Spanish (Spain)',
};

export function localeData(locale: MockLocale | undefined): LocaleData {
  return LOCALES[locale ?? 'en-US'] ?? enUS;
}
