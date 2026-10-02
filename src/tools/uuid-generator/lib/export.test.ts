import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../../test/helpers/settings-guard';
import { UUID_DEFAULTS, uuidSettings } from '../settings';
import { clampCount, exportIds } from './export';

describe('exportIds', () => {
  it('writes txt, csv and json', () => {
    expect(exportIds(['a', 'b'], 'txt')).toBe('a\nb\n');
    expect(exportIds(['a', 'b'], 'csv').trim().split('\n')).toHaveLength(2);
    expect(JSON.parse(exportIds(['a', 'b'], 'json'))).toEqual(['a', 'b']);
  });
  it('clamps the count to 1 to 10,000', () => {
    expect(clampCount(0)).toBe(1);
    expect(clampCount(20_000)).toBe(10_000);
    expect(clampCount(Number.NaN)).toBe(1);
  });
});

describe('uuid settings', () => {
  it('holds options only', () => {
    expect(() => assertNoDataFields(UUID_DEFAULTS)).not.toThrow();
    expect(uuidSettings.getSettings()).toEqual(UUID_DEFAULTS);
  });
});
