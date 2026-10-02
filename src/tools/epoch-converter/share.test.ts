import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { EPOCH_DEFAULTS } from './settings';
import { parseEpochShare } from './share';

describe('epoch share state', () => {
  it('accepts an instant and zones', () => {
    const s = { instant: 1700000000000, zones: ['UTC', 'Europe/Dublin'] };
    expect(parseEpochShare(s)).toEqual(s);
  });
  it('refuses anything else', () => {
    for (const bad of [
      null,
      { instant: '1', zones: [] },
      { instant: 9e15, zones: [] },
      { instant: 1, zones: [1] },
    ])
      expect(parseEpochShare(bad)).toBeNull();
  });
  it('keeps data out of the settings', () => {
    expect(() => assertNoDataFields(EPOCH_DEFAULTS)).not.toThrow();
  });
});
