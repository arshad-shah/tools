import { expect, test, type Page } from '@playwright/test';
import { toolRoutes } from '../e2e/tool-routes';
import { expectAxeClean, setTheme, stabilise, VIEWPORTS } from './helpers';

/*
 * Pages of the new IA (plan A2-15): Home, a hub template, the PDF hub,
 * NotFound and the 30 tools outside the workspace (decision G24: 22 non-PDF
 * tools plus the 8 PDF quick tasks), in both themes. Tool pages at desktop
 * only (spec §16 step 5); Home and hubs at phone width too.
 */
const QUICK_TASKS = new Set([
  'pdf-merger',
  'pdf-splitter',
  'pdf-compressor',
  'images-to-pdf',
  'pdf-to-images',
  'pdf-to-text',
  'pdf-protect',
  'pdf-unlock',
]);
const PHONE_TOOLS = new Set([
  'image-optimizer',
  'color-tester',
  'regex-tester',
  'text-diff-checker',
  'markdown-editor',
]);
const TOOLS = toolRoutes().filter(
  (t) => t.enabled && (t.category !== 'pdf' || QUICK_TASKS.has(t.id)),
);

async function open(page: Page, path: string, theme: 'light' | 'dark') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await setTheme(page, theme);
  // Lazy tool chunks: wait until no loading state remains.
  await expect(
    page.getByRole('status').filter({ hasText: /^Loading/ }),
  ).toHaveCount(0, {
    timeout: 30_000,
  });
  await stabilise(page);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`app pages ${theme}`, () => {
    for (const [name, path] of [
      ['home', '/'],
      ['hub-text', '/text'],
      ['hub-pdf', '/pdf'],
      ['not-found', '/regex-tester'],
    ] as const) {
      test(name, async ({ page }) => {
        await open(page, path, theme);
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
          fullPage: true,
        });
        await expectAxeClean(page);
      });

      if (name !== 'not-found')
        test(`${name} phone`, async ({ page }) => {
          await page.setViewportSize(VIEWPORTS.phone);
          await open(page, path, theme);
          await expect(page).toHaveScreenshot(`${name}-phone-${theme}.png`, {
            fullPage: true,
          });
        });
    }

    // Flagship data page at phone width (spec 12.5).
    test('tool csv-viewer phone', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await open(page, '/data/csv', theme);
      await expect(page).toHaveScreenshot(`tool-csv-viewer-phone-${theme}.png`);
      await expectAxeClean(page);
    });

    for (const tool of TOOLS)
      test(`tool ${tool.id}`, async ({ page }) => {
        await open(page, tool.path, theme);
        await expect(
          page.getByRole('heading', { level: 1, name: tool.name }),
        ).toBeVisible();
        await expect(page).toHaveScreenshot(`tool-${tool.id}-${theme}.png`);
        await expectAxeClean(page);
      });

    // Flagship web page at phone width too (plan G2-12).
    test('tool api-request phone', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await open(
        page,
        toolRoutes().find((t) => t.id === 'api-request')!.path,
        theme,
      );
      await expect(page).toHaveScreenshot(
        `tool-api-request-phone-${theme}.png`,
        {
          fullPage: true,
        },
      );
    });

    // Part 6-C flagship text tools at phone width (spec 12.5).
    for (const tool of TOOLS.filter((t) => PHONE_TOOLS.has(t.id)))
      test(`tool ${tool.id} phone`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.phone);
        await open(page, tool.path, theme);
        await expect(page).toHaveScreenshot(
          `tool-${tool.id}-phone-${theme}.png`,
          { fullPage: true },
        );
      });
  });
}
