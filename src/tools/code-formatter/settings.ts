import { createToolSettings, type Json } from '@/shared/lib/tool-settings';
import {
  DEFAULT_FORMAT_OPTIONS,
  isFormatLanguage,
  SQL_DIALECTS,
  type FormatLanguage,
  type FormatOptions,
} from './lib/languages';

/** Stored as plain JSON; read through `readFormatterSettings`. */
export interface FormatterSettingsStored {
  /** `auto` or a FormatLanguage. */
  language: string;
  mangle: boolean;
  /** Per-language option overrides (spec 9.3: options per language). */
  byLanguage: { [lang: string]: Json };
}

export const FORMATTER_SETTINGS_DEFAULTS: FormatterSettingsStored = {
  language: 'auto',
  mangle: true,
  byLanguage: {},
};

export const formatterSettings = createToolSettings<FormatterSettingsStored>(
  'code-formatter',
  FORMATTER_SETTINGS_DEFAULTS,
  { version: 1 },
);

export const readLanguage = (
  s: FormatterSettingsStored,
): FormatLanguage | 'auto' =>
  isFormatLanguage(s.language) ? s.language : 'auto';

const oneOf = <T>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : fallback;

/** The options for `lang`: stored overrides that are valid, else defaults. */
export function optionsFor(
  s: FormatterSettingsStored,
  lang: FormatLanguage,
): FormatOptions {
  const raw = s.byLanguage[lang];
  const o = (
    typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? raw : {}
  ) as Record<string, unknown>;
  const d = DEFAULT_FORMAT_OPTIONS;
  const width = o.printWidth;
  return {
    indent: oneOf(o.indent, [2, 4, 'tab'] as const, d.indent),
    printWidth:
      typeof width === 'number' &&
      Number.isInteger(width) &&
      width >= 20 &&
      width <= 320
        ? width
        : d.printWidth,
    singleQuote:
      typeof o.singleQuote === 'boolean' ? o.singleQuote : d.singleQuote,
    semi: typeof o.semi === 'boolean' ? o.semi : d.semi,
    trailingComma: oneOf(
      o.trailingComma,
      ['none', 'es5', 'all'] as const,
      d.trailingComma,
    ),
    bracketSpacing:
      typeof o.bracketSpacing === 'boolean'
        ? o.bracketSpacing
        : d.bracketSpacing,
    sqlDialect: oneOf(o.sqlDialect, SQL_DIALECTS, d.sqlDialect),
    keywordCase: oneOf(
      o.keywordCase,
      ['upper', 'lower', 'preserve'] as const,
      d.keywordCase,
    ),
  };
}

/** A settings patch storing `patch` over the current options for `lang`. */
export function withOptions(
  s: FormatterSettingsStored,
  lang: FormatLanguage,
  patch: Partial<FormatOptions>,
): Pick<FormatterSettingsStored, 'byLanguage'> {
  return {
    byLanguage: {
      ...s.byLanguage,
      [lang]: { ...optionsFor(s, lang), ...patch } as unknown as Json,
    },
  };
}
