import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { NUMBER_DEFAULTS } from './settings';
import { parseNumberShare } from './share';

describe('number share state', () => {
  const ok = { value: '-255', bits: 16, signed: true, customBase: 7 };
  it('accepts a valid state', () => {
    expect(parseNumberShare(ok)).toEqual(ok);
  });
  it('refuses anything else', () => {
    for (const bad of [
      null,
      [],
      { ...ok, value: '1.5' },
      { ...ok, value: 12 },
      { ...ok, bits: 12 },
      { ...ok, signed: 'yes' },
      { ...ok, customBase: 37 },
    ])
      expect(parseNumberShare(bad)).toBeNull();
  });
  it('keeps data out of the settings', () => {
    expect(() => assertNoDataFields(NUMBER_DEFAULTS)).not.toThrow();
  });
});
