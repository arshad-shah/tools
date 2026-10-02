// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { EXIF_DEFAULTS } from './settings';

describe('exif settings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('hold the strip options only, never files or metadata', () => {
    expect(() => assertNoDataFields(EXIF_DEFAULTS)).not.toThrow();
    expect(EXIF_DEFAULTS).toEqual({ keepIcc: true, keepOrientation: false });
  });

  it('remember Keep ICC and Keep orientation across visits', async () => {
    const first = await import('./settings');
    const { result } = renderHook(() => first.exifSettings.useSettings());
    act(() => result.current[1]({ keepIcc: false, keepOrientation: true }));
    vi.resetModules();
    const second = await import('./settings');
    expect(second.exifSettings.getSettings()).toEqual({
      keepIcc: false,
      keepOrientation: true,
    });
  });
});
