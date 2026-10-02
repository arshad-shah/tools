import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export type Theme = 'light' | 'dark';

export const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
} as const;

/**
 * Applies a theme without a reload: stores the preference the bootstrap
 * script reads (so later navigations keep it) and sets data-theme now.
 */
export async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate((t) => {
    try {
      localStorage.setItem('tools:theme', t);
    } catch {
      // storage blocked: data-theme below still applies
    }
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
  }, theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

/** Waits for fonts, stops caret and transitions, masks [data-dynamic]. */
export async function stabilise(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.addStyleTag({
    content: `*, *::before, *::after {
      transition: none !important;
      animation: none !important;
      caret-color: transparent !important;
    }
    [data-dynamic] { visibility: hidden !important; }`,
  });
}

/** Fails on serious or critical axe violations. */
export async function expectAxeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    }));
  expect(blocking).toEqual([]);
}
