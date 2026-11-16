/** @vitest-environment jsdom */
import { CynosureTheme } from '@arshad-shah/cynosure';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toolsTheme } from '@/theme/tools-theme';
import { resetThemeForTests, THEME_KEY, useTheme, useThemeSync } from './theme';

/*
 * Colour mode through Cynosure (redesign spec, rule 4): useColorMode with
 * the tools:theme key, the same saved values as before.
 */
function stubMatchMedia(dark: boolean) {
  const listeners = new Set<() => void>();
  const mq = (query: string) => ({
    matches: query.includes('dark') ? dark : false,
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    addListener: (l: () => void) => listeners.add(l),
    removeListener: (l: () => void) => listeners.delete(l),
  });
  vi.stubGlobal('matchMedia', vi.fn(mq));
}

const html = document.documentElement;

/** What App mounts: the theme on the document, in the saved mode. */
function Root() {
  const { preference } = useTheme();
  useThemeSync();
  return (
    <CynosureTheme theme={toolsTheme} mode={preference} target="document" />
  );
}

beforeEach(() => {
  resetThemeForTests();
  localStorage.clear();
  stubMatchMedia(false);
});
afterEach(() => vi.unstubAllGlobals());

describe('colour mode', () => {
  it.each(['system', 'light', 'dark'] as const)(
    'reads a saved %s preference back',
    (saved) => {
      localStorage.setItem(THEME_KEY, saved);
      const { result } = renderHook(() => useTheme());
      expect(result.current.preference).toBe(saved);
    },
  );

  it('treats an unknown saved value as system', () => {
    localStorage.setItem(THEME_KEY, 'purple');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
  });

  it('persists a choice under tools:theme and marks <html>', () => {
    render(<Root />);
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setPreference('dark'));
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(html.getAttribute('data-cy-mode')).toBe('dark');
    expect(html.dataset.theme).toBe('dark');
    act(() => result.current.setPreference('light'));
    expect(html.getAttribute('data-cy-mode')).toBe('light');
    expect(html.dataset.theme).toBe('light');
  });

  it('resolves system from the OS', () => {
    stubMatchMedia(true);
    render(<Root />);
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
    expect(result.current.resolved).toBe('dark');
    expect(html.getAttribute('data-cy-mode')).toBe('system');
    expect(html.dataset.theme).toBe('dark');
  });

  it('themes the document with the tools accent', () => {
    render(<Root />);
    expect(html.style.getPropertyValue('--cy-color-accent')).toBe('#3ddc97');
  });

  it('follows a mode chosen in another tab', () => {
    render(<Root />);
    act(() => {
      localStorage.setItem(THEME_KEY, 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_KEY, newValue: 'dark' }),
      );
    });
    expect(html.getAttribute('data-cy-mode')).toBe('dark');
  });
});
