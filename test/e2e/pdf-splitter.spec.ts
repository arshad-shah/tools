import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';

test('splits by ranges into a zip of documents', async ({ page }) => {
  await page.goto('/pdf-splitter');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Page ranges' }).click();
  await page.getByLabel('Ranges').fill('1-3, 10-');
  await page.getByRole('button', { name: 'Split PDF' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all (ZIP)' }).click();
  const zip = unzipSync(readFileSync((await (await downloadPromise).path())!));
  const names = Object.keys(zip).sort();
  expect(names).toEqual(['text-12.pages-1-3.pdf', 'text-12.pages-10-12.pdf']);
  expect(
    (await PDFDocument.load(zip['text-12.pages-10-12.pdf'])).getPageCount(),
  ).toBe(3);
});

test('extracts selected pages into one document', async ({ page }) => {
  await page.goto('/pdf-splitter');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();

  const tiles = page.locator('li[data-sortable-item]');
  await tiles.nth(1).click();
  await tiles.nth(2).focus();
  await page.keyboard.press('Space');
  await expect(tiles.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(tiles.nth(2)).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: 'Split PDF' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const bytes = readFileSync((await (await downloadPromise).path())!);
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  expect(await pdfPageTexts(new Uint8Array(bytes))).toEqual([
    'Beta 2',
    'Beta 3',
  ]);
});

test('shows a precise error for a bad range', async ({ page }) => {
  await page.goto('/pdf-splitter');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'Page ranges' }).click();
  await page.getByLabel('Ranges').fill('2-9');
  await page.getByRole('button', { name: 'Split PDF' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Page 9 is out of range (1–3)' }),
  ).toBeVisible();
});

test('stale results disappear when settings change', async ({ page }) => {
  await page.goto('/pdf-splitter');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  await page.getByRole('tab', { name: 'Page ranges' }).click();
  await page.getByLabel('Ranges').fill('1-3, 10-');
  await page.getByRole('button', { name: 'Split PDF' }).click();
  const zipButton = page.getByRole('button', { name: 'Download all (ZIP)' });
  await expect(zipButton).toBeVisible();
  await page.getByRole('tab', { name: 'Every page' }).click();
  await expect(zipButton).toHaveCount(0);
});

test('select all and clear selection', async ({ page }) => {
  await page.goto('/pdf-splitter');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('button', { name: 'Select all' }).click();
  await expect(page.locator('li[aria-selected=true]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await expect(page.locator('li[aria-selected=true]')).toHaveCount(0);
});

test('shift-click selects a range of pages', async ({ page }) => {
  await page.goto('/pdf-splitter');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  const tiles = page.locator('li[data-sortable-item]');
  await expect(tiles).toHaveCount(12);
  await tiles.nth(2).click();
  await tiles.nth(6).click({ modifiers: ['Shift'] });
  await expect(page.locator('li[aria-selected=true]')).toHaveCount(5);
  await expect(page.getByText('(5 selected)')).toBeVisible();

  await page.getByRole('button', { name: 'Split PDF' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const bytes = readFileSync((await (await downloadPromise).path())!);
  expect(await pdfPageTexts(new Uint8Array(bytes))).toEqual([
    'Beta 3',
    'Beta 4',
    'Beta 5',
    'Beta 6',
    'Beta 7',
  ]);
});
