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
    // The theme store reads storage on its next render, so the header and
    // footer theme controls flipped only if something happened to re-render
    // before the shot. Its cross-tab sync re-renders them now, every run.
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'tools:theme', newValue: t }),
    );
  }, theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

/**
 * The PDF workspace starts work on open (field detection, whose results are
 * saved with the document, the size breakdown, signature checks) and
 * autosaves every change, flipping the top bar between "Saving" and "Saved".
 * Waits until the page has been quiet across two checks 1.5 s apart.
 */
export async function workspaceQuiet(page: Page): Promise<void> {
  const busy = page
    .getByText(
      /^(Detecting fields, page|Measuring the document|Checking signatures)/,
    )
    .or(page.getByText('Saving', { exact: true }))
    .or(page.getByRole('img', { name: 'Saving', exact: true }));
  const saved = page
    .getByText('Saved on this device')
    .or(page.getByRole('img', { name: 'Saved on this device' }))
    .first();
  const quiet = async () =>
    (await busy.count()) === 0 && (await saved.isVisible());
  await expect
    .poll(
      async () => {
        if (!(await quiet())) return false;
        await page.waitForTimeout(1_500);
        return quiet();
      },
      { timeout: 30_000 },
    )
    .toBe(true);
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

/**
 * Fails on serious or critical axe violations. Sandboxed frames are skipped:
 * they run no scripts, so axe cannot be injected into them (it would wait
 * for them and then fail opening a helper page), and their content is the
 * user's untrusted HTML, not ours.
 */
export async function expectAxeClean(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .exclude('iframe[sandbox]')
    .analyze();
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

/**
 * Touch emulation (pointer: coarse) is dropped by Chromium whenever
 * Playwright overrides the device metrics, which a full-page screenshot and
 * setViewportSize both do. Turn it back on over CDP.
 */
export async function keepTouch(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 1,
  });
  await expect
    .poll(() => page.evaluate(() => matchMedia('(pointer: coarse)').matches))
    .toBe(true);
}

/**
 * Grows the viewport to the whole page on a touch screen, so a plain
 * (viewport) screenshot shows everything with the coarse-pointer styles.
 * Measured twice: touch sizing changes the page height.
 */
export async function touchFullPage(page: Page, width: number): Promise<void> {
  for (let i = 0; i < 2; i++) {
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    await page.setViewportSize({ width, height });
    await keepTouch(page);
  }
}
