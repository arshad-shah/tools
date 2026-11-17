/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { themeInitJs } from '../scripts/gen-cynosure-theme';

/*
 * No flash of the wrong theme (redesign spec, rule 4). public/theme-init.js
 * is Cynosure's themeInitScript for tools:theme, loaded as a file (the CSP
 * forbids inline scripts) before anything paints. With a saved mode it
 * marks <html data-cy-mode>; with nothing valid saved (or storage blocked)
 * it marks "system", so the document follows the OS from the first paint.
 */
const script = readFileSync('public/theme-init.js', 'utf8');
const run = () => new Function(script)();
const html = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  html.removeAttribute('data-cy-mode');
});
afterEach(() => vi.restoreAllMocks());

describe('theme-init.js', () => {
  it("is Cynosure's script for tools:theme, byte for byte", () => {
    expect(script).toBe(themeInitJs());
  });

  it.each(['light', 'dark', 'system'])('applies a saved %s mode', (saved) => {
    localStorage.setItem('tools:theme', saved);
    run();
    expect(html.getAttribute('data-cy-mode')).toBe(saved);
  });

  it.each([null, 'purple'])('follows the OS for %s', (saved) => {
    if (saved) localStorage.setItem('tools:theme', saved);
    run();
    expect(html.getAttribute('data-cy-mode')).toBe('system');
  });

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(run).not.toThrow();
    expect(html.getAttribute('data-cy-mode')).toBe('system');
  });

  it('runs from <head> before the app, as a file', () => {
    const page = readFileSync('index.html', 'utf8');
    const head = page.slice(0, page.indexOf('</head>'));
    expect(head).toContain('<script src="/theme-init.js"></script>');
    expect(page.indexOf('/theme-init.js')).toBeLessThan(
      page.indexOf('/src/main.tsx'),
    );
  });

  it('needs no color-scheme rule of the app: Cynosure follows the mark', () => {
    // Cynosure gap 2, fixed in 0.7.0: the script marks `system` when nothing
    // is saved and Cynosure's stylesheet maps every mark to a color-scheme.
    expect(readFileSync('src/theme/app.css', 'utf8')).not.toContain(
      'color-scheme',
    );
  });
});
