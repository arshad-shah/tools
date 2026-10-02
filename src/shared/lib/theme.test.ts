/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  readThemePreference,
  resetThemeForTests,
  startThemeSync,
  resolveTheme,
  THEME_KEY,
  useTheme,
  writeThemePreference,
  type ThemePreference,
} from './theme';

function stubMatchMedia(dark: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    matches: dark,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mq),
  );
  return {
    set(next: boolean) {
      mq.matches = next;
      for (const l of listeners) l();
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  resetThemeForTests();
  delete document.documentElement.dataset.theme;
});
afterEach(() => vi.unstubAllGlobals());

describe('applyTheme', () => {
  it('sets data-theme only; color-scheme follows from tokens.css', () => {
    document.documentElement.removeAttribute('style');
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    // No inline style: an inline color-scheme would outlive a theme switch
    // and is UI styling outside the kit (rule (b)).
    expect(document.documentElement.getAttribute('style')).toBeNull();
  });
});

describe('resolveTheme', () => {
  it.each<[ThemePreference, boolean, string]>([
    ['system', false, 'light'],
    ['system', true, 'dark'],
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
  ])('%s with prefers-dark=%s is %s', (p, dark, out) => {
    expect(resolveTheme(p, dark)).toBe(out);
  });
});

describe('theme preference', () => {
  it('defaults to system and ignores junk in storage', () => {
    localStorage.setItem(THEME_KEY, 'purple');
    expect(readThemePreference()).toBe('system');
  });

  it('writeThemePreference persists and applies', () => {
    stubMatchMedia(false);
    writeThemePreference('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('a throwing localStorage still applies the theme', () => {
    stubMatchMedia(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeThemePreference('dark')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(readThemePreference()).toBe('dark');
  });

  it('useTheme follows the system while the preference is system', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current).toMatchObject({
      preference: 'system',
      resolved: 'light',
    });
    act(() => media.set(true));
    expect(result.current.resolved).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    act(() => result.current.setPreference('light'));
    expect(result.current).toMatchObject({
      preference: 'light',
      resolved: 'light',
    });
  });
});

describe('theme sync without subscribers (review M18)', () => {
  it('follows an OS change with no useTheme mounted', () => {
    const media = stubMatchMedia(false);
    startThemeSync();
    media.set(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('applies a preference changed in another tab', () => {
    stubMatchMedia(false);
    startThemeSync();
    const { result } = renderHook(() => useTheme());
    act(() => {
      localStorage.setItem(THEME_KEY, 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_KEY, newValue: 'dark' }),
      );
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(result.current.preference).toBe('dark');
  });
});
