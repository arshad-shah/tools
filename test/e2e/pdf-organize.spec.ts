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
  // Thumbnails far below the fold keep their spinner overlay (a canvas
  // sibling) until scrolled into view; drawn ones have none. A canvas' own
  // width defaults to 300, so it cannot tell drawn from undrawn.
  const rendered = await page.evaluate(
    () =>
      Array.from(
        document.querySelectorAll('canvas[aria-label^="Page"]'),
      ).filter((c) => c.nextElementSibling === null).length,
  );
  expect(rendered).toBeLessThan(100);
});
