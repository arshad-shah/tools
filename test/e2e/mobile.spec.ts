import { expect, test } from '@playwright/test';
import { toolRoutes } from './tool-routes';

/*
 * Mobile pass (6-H): no page scrolls sideways on a 360 px phone. Home,
 * every hub, every non-PDF tool page and the not-found page; the PDF
 * workspace is covered by the PDF Parts.
 */
const HUBS = [
  'text',
  'data',
  'encoding',
  'security',
  'math',
  'time',
  'media',
  'web',
];
const TOOLS = toolRoutes().filter((t) => t.enabled && t.category !== 'pdf');
const ROUTES = [
  '/',
  ...HUBS.map((h) => `/${h}`),
  ...TOOLS.map((t) => t.path),
  '/no-such-page',
];

test.use({ viewport: { width: 360, height: 780 }, hasTouch: true });

for (const route of ROUTES) {
  test(`${route} has no horizontal scroll at 360 px`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('main')).not.toBeEmpty();
    // Lazy tool chunks render after the shell; wait for the loading line.
    await expect(page.getByText(/^Loading /)).toHaveCount(0, {
      timeout: 30_000,
    });
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.scrollingElement!.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
}
