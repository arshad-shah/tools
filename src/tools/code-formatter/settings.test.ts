import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { DEFAULT_FORMAT_OPTIONS } from './lib/languages';
import {
  FORMATTER_SETTINGS_DEFAULTS as D,
  optionsFor,
  readLanguage,
  withOptions,
} from './settings';

describe('formatter settings', () => {
  it('persists options, never code', () => {
    expect(() => assertNoDataFields(D)).not.toThrow();
  });

  it('keeps options per language', () => {
    const s = {
      ...D,
      ...withOptions(D, 'javascript', { semi: false, indent: 4 }),
    };
    expect(optionsFor(s, 'javascript')).toEqual({
      ...DEFAULT_FORMAT_OPTIONS,
      semi: false,
      indent: 4,
    });
    expect(optionsFor(s, 'css')).toEqual(DEFAULT_FORMAT_OPTIONS);
  });

  it('ignores invalid stored values', () => {
    const s = {
      ...D,
      language: 'cobol',
      byLanguage: { sql: { printWidth: 5, keywordCase: 'shout', semi: 'no' } },
    };
    expect(readLanguage(s)).toBe('auto');
    expect(optionsFor(s, 'sql')).toEqual(DEFAULT_FORMAT_OPTIONS);
  });
});
