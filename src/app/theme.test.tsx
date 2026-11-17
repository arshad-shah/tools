/** @vitest-environment jsdom */
import { ThemeToggle } from '@arshad-shah/cynosure';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_KEY } from '@/theme/tools-theme';
import { Theme } from './Theme';

/*
 * Colour mode (redesign spec, rule 4): Cynosure's useColorMode and
 * ThemeToggle with the tools:theme key, the same saved values as before.
 */
const html = document.documentElement;

function stubMatchMedia(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('dark') ? dark : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    })),
  );
}

const app = () =>
  render(
    <Theme>
      <ThemeToggle variant="cycle" storageKey={THEME_KEY} />
    </Theme>,
  );

beforeEach(() => {
  localStorage.clear();
  html.removeAttribute('data-cy-mode');
  stubMatchMedia(false);
});
afterEach(() => vi.unstubAllGlobals());

describe('colour mode', () => {
  it.each(['light', 'dark', 'system'])('applies a saved %s mode', (saved) => {
    localStorage.setItem(THEME_KEY, saved);
    app();
    expect(html.getAttribute('data-cy-mode')).toBe(saved);
  });

  it('follows the OS when nothing is saved', () => {
    app();
    expect(html.getAttribute('data-cy-mode')).toBe('system');
  });

  it('saves the mode picked in the toggle under tools:theme', () => {
    localStorage.setItem(THEME_KEY, 'light');
    app();
    fireEvent.click(screen.getByRole('button', { name: /Colour mode/ }));
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(html.getAttribute('data-cy-mode')).toBe('dark');
  });

  it('themes the document with the tools accent', () => {
    app();
    expect(html.style.getPropertyValue('--cy-color-accent')).toBe('#3ddc97');
  });
});
