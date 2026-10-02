import { expect, test, type Page } from '@playwright/test';
import { toolRoutes } from '../e2e/tool-routes';
import {
  expectAxeClean,
  setTheme,
  stabilise,
  touchFullPage,
  VIEWPORTS,
} from './helpers';

/*
 * Pages of the new IA (plan A2-15): Home, a hub template, the PDF hub,
 * NotFound and the tools outside the workspace (decision G24: the non-PDF
 * tools plus the 8 PDF quick tasks), in both themes at desktop. The 6-H
 * mobile pass adds every non-PDF tool page, Home and the hubs at phone width
 * with a touch screen (coarse pointer), each with an axe check.
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
    }

    for (const tool of TOOLS)
      test(`tool ${tool.id}`, async ({ page }) => {
        await open(page, tool.path, theme);
        await expect(
          page.getByRole('heading', { level: 1, name: tool.name }),
        ).toBeVisible();
        await expect(page).toHaveScreenshot(`tool-${tool.id}-${theme}.png`);
        await expectAxeClean(page);
      });
  });
}

const PHONE_PAGES: [string, string][] = [
  ['home', '/'],
  ['hub-text', '/text'],
  ['hub-pdf', '/pdf'],
  ...TOOLS.filter((t) => t.category !== 'pdf').map((t): [string, string] => [
    `tool-${t.id}`,
    t.path,
  ]),
];

for (const theme of ['light', 'dark'] as const) {
  test.describe(`app pages phone ${theme}`, () => {
    test.use({ viewport: VIEWPORTS.phone, hasTouch: true });

    for (const [name, path] of PHONE_PAGES)
      test(`${name} phone`, async ({ page }) => {
        await open(page, path, theme);
        await touchFullPage(page, VIEWPORTS.phone.width);
        await expect(page).toHaveScreenshot(`${name}-phone-${theme}.png`);
        await expectAxeClean(page);
      });
  });
}
