import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../e2e/tool-routes';
import {
  expectAxeClean,
  setTheme,
  stabilise,
  VIEWPORTS,
  type Theme,
} from './helpers';

/*
 * JSON & XML Viewer (plan B-12): the Tree and Map tabs with the bookstore
 * sample, both themes, desktop and phone.
 */
async function open(page: Page, theme: Theme) {
  await page.goto(pathOf('json-and-xml-viewer'));
  await setTheme(page, theme);
  await page.getByRole('button', { name: 'Load a sample' }).click();
  await page.getByRole('menuitem', { name: 'JSON bookstore' }).click();
  // One pane at a time (R41): the sample lands in Source.
  await page.getByRole('tab', { name: 'Tree', exact: true }).click();
  await expect(page.getByRole('tree', { name: 'Document tree' })).toBeVisible();
  await stabilise(page);
}

for (const theme of ['light', 'dark'] as const)
  for (const [size, viewport] of Object.entries(VIEWPORTS))
    test.describe(`json-and-xml-viewer ${size} ${theme}`, () => {
      test.use({ viewport });

      test('tree', async ({ page }) => {
        await open(page, theme);
        await expect(page).toHaveScreenshot(
          `json-xml-tree-${size}-${theme}.png`,
        );
        await expectAxeClean(page);
      });

      test('map', async ({ page }) => {
        await open(page, theme);
        await page.getByRole('tab', { name: 'Map' }).click();
        await expect(page.getByTestId('diagram-canvas')).toBeVisible();
        await expect(
          page.getByText('8 objects', { exact: true }),
        ).toBeVisible();
        await expect(page).toHaveScreenshot(
          `json-xml-map-${size}-${theme}.png`,
        );
        await expectAxeClean(page);
      });
    });
