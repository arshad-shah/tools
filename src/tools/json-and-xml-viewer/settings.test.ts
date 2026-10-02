import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { DEFAULT_SETTINGS, pushHistory } from './settings';

describe('viewer settings', () => {
  it('holds no data fields', () => {
    expect(() => assertNoDataFields(DEFAULT_SETTINGS)).not.toThrow();
  });

  it('keeps the last ten distinct queries, newest first', () => {
    let h: string[] = [];
    for (let i = 0; i < 12; i++) h = pushHistory(h, `$.a${i}`);
    expect(h).toHaveLength(10);
    expect(h[0]).toBe('$.a11');
    expect(pushHistory(['$.x', '$.y'], ' $.y ')).toEqual(['$.y', '$.x']);
    expect(pushHistory(['$.x'], '  ')).toEqual(['$.x']);
  });
});
