import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { JWT_DEFAULTS, jwtSettings } from './settings';

describe('jwt settings', () => {
  it('keeps the skew and key kind, never a key or token', () => {
    expect(() => assertNoDataFields(JWT_DEFAULTS)).not.toThrow();
    expect(Object.keys(JWT_DEFAULTS).sort()).toEqual(['keyKind', 'skew']);
    expect(jwtSettings.getSettings()).toEqual(JWT_DEFAULTS);
  });
});
