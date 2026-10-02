import { describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { FAVICON_DEFAULTS } from './settings';

describe('favicon settings', () => {
  it('hold styling only, never the source text or image', () => {
    expect(() => assertNoDataFields(FAVICON_DEFAULTS)).not.toThrow();
    expect(Object.keys(FAVICON_DEFAULTS)).not.toContain('text');
  });
});
