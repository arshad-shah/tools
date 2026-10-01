import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('reorders, rotates and deletes pages', async ({ page }) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  const tiles = page
    .getByRole('list', { name: /^Pages/ })
    .getByRole('listitem');
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
  await expect(
    page.getByRole('list', { name: /^Pages/ }).getByRole('listitem'),
  ).toHaveCount(300);
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();
  // Only thumbnails near the viewport get drawn; wait for the first draw,
  // then check the rest were not rendered up front.
  const drawn = page.locator('canvas[data-rendered="true"]');
  await expect.poll(() => drawn.count()).toBeGreaterThanOrEqual(1);
  expect(await drawn.count()).toBeLessThan(100);

  // Scroll to the bottom: tiles far above release their pixels, so the
  // number of drawn canvases stays bounded instead of growing to 300.
  const firstCanvas = page.getByRole('img', { name: /^Page 1(,|$)/ });
  const lastCanvas = page.getByRole('img', { name: /^Page 300(,|$)/ });
  await lastCanvas.scrollIntoViewIfNeeded();
  await expect(lastCanvas).toHaveAttribute('data-rendered', 'true');
  await expect(firstCanvas).not.toHaveAttribute('data-rendered', 'true');
  expect(await drawn.count()).toBeLessThan(100);

  // And back: the released first page is drawn again.
  await firstCanvas.scrollIntoViewIfNeeded();
  await expect(firstCanvas).toHaveAttribute('data-rendered', 'true');
  await expect(lastCanvas).not.toHaveAttribute('data-rendered', 'true');
  expect(await drawn.count()).toBeLessThan(100);
});

test('guards keep one page, range-selects and resets', async ({ page }) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  const tiles = page
    .getByRole('list', { name: /^Pages/ })
    .getByRole('listitem');
  await expect(tiles).toHaveCount(3);

  // Shift-click selects the range from the anchor; Delete is blocked when
  // every page is selected.
  await tiles.first().click();
  await tiles.nth(2).click({ modifiers: ['Shift'] });
  await expect(
    page.getByRole('checkbox', { name: 'Select page 2' }),
  ).toBeChecked();
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

test('keeps document structure and says plainly what it removed', async ({
  page,
}) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/structured-3.pdf');
  await expect(
    page.getByRole('list', { name: /^Pages/ }).getByRole('listitem'),
  ).toHaveCount(3);
  await page.getByRole('button', { name: 'Delete page 3' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Apply & download' }).click();
  const download = await downloadPromise;
  const doc = await PDFDocument.load(readFileSync((await download.path())!));
  expect(doc.getTitle()).toBe('Structured fixture');
  expect(doc.getAuthor()).toBe('Fixture Author');
  expect(
    doc
      .getForm()
      .getFields()
      .map((f) => f.getName()),
  ).toEqual(['first.name']);

  await expect(page.getByText(/Page labels were removed/)).toBeVisible();
  await expect(
    page.getByText(
      '1 form field that only appeared on deleted pages was removed.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      '1 bookmark pointed to a deleted page and now leads nowhere.',
    ),
  ).toBeVisible();
});

test('arrow keys move focus between tiles; the grid is one Tab stop', async ({
  page,
}) => {
  await page.goto('/pdf-organize');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  const tiles = page
    .getByRole('list', { name: /^Pages/ })
    .getByRole('listitem');
  await expect(tiles).toHaveCount(12);
  await tiles.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tiles.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(tiles.nth(11)).toBeFocused();
  await expect(tiles.nth(11)).toHaveAttribute('tabindex', '0');
  await expect(tiles.first()).toHaveAttribute('tabindex', '-1');
});
