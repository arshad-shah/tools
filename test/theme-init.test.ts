/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * public/theme-init.js resolves the theme before first paint for both
 * tools' tokens (data-theme) and Cynosure's (data-cy-mode), so neither
 * flashes the wrong mode (tools#104, Phase 0 Task 2).
 */
const script = readFileSync('public/theme-init.js', 'utf8');
const run = () => new Function(script)();
const html = document.documentElement;

function osDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: dark })),
  );
}

beforeEach(() => {
  localStorage.clear();
  html.removeAttribute('data-theme');
  html.removeAttribute('data-cy-mode');
});
afterEach(() => vi.unstubAllGlobals());

describe('theme-init.js', () => {
  it.each([
    [null, false, 'light'],
    [null, true, 'dark'],
    ['system', true, 'dark'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['purple', true, 'dark'],
  ])('saved %s, OS dark %s: %s on both attributes', (saved, dark, out) => {
    if (saved) localStorage.setItem('tools:theme', saved);
    osDark(dark);
    run();
    expect(html.dataset.theme).toBe(out);
    expect(html.getAttribute('data-cy-mode')).toBe(out);
  });
});
