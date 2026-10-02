import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { COLOR_DEFAULTS } from './settings';

describe('color settings', () => {
  it('hold configuration only (named palettes are presets, not data)', () => {
    expect(() => assertNoDataFields(COLOR_DEFAULTS)).not.toThrow();
    expect(Object.keys(COLOR_DEFAULTS).sort()).toEqual([
      'lastColors',
      'palettes',
      'scale',
    ]);
  });
});
