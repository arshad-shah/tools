import { expect, test } from '@playwright/test';
import { toolRoutes } from './tool-routes';

const ENABLED = toolRoutes().filter((t) => t.enabled);

/** Tools that render more after load (timers, debounces): what to wait for. */
const READY: Record<string, string> = {
  // The sample token is decoded 300 ms after mount.
  'jwt-decode': 'role=button[name="Raw JSON"]',
};

test('dashboard lists tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tools');
  await expect(page.getByText('PDF Merger')).toBeVisible();
});

test('footer shows on dashboard and tool pages with per-tool issue link', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('footer')).toBeVisible();
  await page.goto('/pdf-merger');
  const footer = page.locator('footer');
  await expect(footer).toBeVisible();
  await expect(
    footer.getByRole('link', {
      name: 'issues: report a problem with PDF Merger',
    }),
  ).toHaveAttribute('href', /%5Bpdf-merger%5D/);
});

test('footer causes no horizontal scroll at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page.locator('footer')).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(375);
});

test('every enabled tool is discovered', () => {
  // 21 legacy tools + pdf-merger, pdf-splitter, pdf-organize (+ phase-3 tools).
  expect(ENABLED.length).toBeGreaterThanOrEqual(24);
});

for (const tool of ENABLED) {
  test(`${tool.id} renders with no console or page errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });

    await page.goto(`/${tool.id}`);
    await expect(
      page.getByRole('heading', { level: 1, name: tool.name }),
    ).toBeVisible();
    // The lazy chunk resolved and the tool did not hit its error boundary.
    await expect(page.getByText(`Loading ${tool.name}…`)).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(
      page.getByText(`${tool.name} encountered an error`),
    ).toHaveCount(0);
    await expect(page.locator('main')).not.toBeEmpty();
    // Deferred work must render before the assertion, or its console errors
    // land after it: wait for the tool's ready marker where it renders late,
    // then for the browser to go idle.
    const ready = READY[tool.id];
    if (ready) await expect(page.locator(ready).first()).toBeVisible();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestIdleCallback(() => resolve())),
    );
    expect(errors).toEqual([]);
  });
}
