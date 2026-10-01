import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('reorders, rotates and deletes pages', async ({ page }) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  const tiles = page.locator('li[data-sortable-item]');
  await expect(tiles).toHaveCount(3);
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();

  // Move page 3 to the front with the keyboard.
  await tiles.nth(2).focus();
  await page.keyboard.press('Alt+ArrowLeft');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(tiles.first()).toContainText('3');
  await expect(tiles.first()).toBeFocused();

  await page.getByRole('button', { name: 'Rotate page 3 right' }).click();
  await page.getByRole('button', { name: 'Delete page 2' }).click();
  await expect(tiles).toHaveCount(2);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Apply & download' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.organized.pdf');
  const doc = await PDFDocument.load(readFileSync((await download.path())!));
  expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 0]);
});

test('handles a 300-page document without rendering every page up front', async ({
  page,
}) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-300.pdf');
  await expect(page.locator('li[data-sortable-item]')).toHaveCount(300);
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();
  // Only thumbnails near the viewport get drawn; wait for the first draw,
  // then check the rest were not rendered up front.
  const drawn = page.locator('canvas[data-rendered="true"]');
  await expect.poll(() => drawn.count()).toBeGreaterThanOrEqual(1);
  expect(await drawn.count()).toBeLessThan(100);
});

test('guards keep one page, range-selects and resets', async ({ page }) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  const tiles = page.locator('li[data-sortable-item]');
  await expect(tiles).toHaveCount(3);

  // Shift-click selects the range from the anchor; Delete is blocked when
  // every page is selected.
  await tiles.first().click();
  await tiles.nth(2).click({ modifiers: ['Shift'] });
  await expect(tiles.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('button', { name: 'Delete', exact: true }),
  ).toBeDisabled();

  // Reorder, then Reset restores the original order.
  await tiles.nth(2).focus();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(tiles.nth(1)).toContainText('3');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(tiles.nth(1)).toContainText('2');
  await expect(tiles.nth(2)).toContainText('3');

  // Per-tile delete is disabled on the last remaining page.
  await page.getByRole('button', { name: 'Delete page 1' }).click();
  await page.getByRole('button', { name: 'Delete page 2' }).click();
  await expect(tiles).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Delete page 3' }),
  ).toBeDisabled();
});
