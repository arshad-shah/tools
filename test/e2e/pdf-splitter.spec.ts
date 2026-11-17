import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';
import { pathOf } from './tool-routes';

test('splits by ranges into a zip of documents', async ({ page }) => {
  await page.goto(pathOf('pdf-splitter'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();

  await page.getByRole('radio', { name: 'Page ranges' }).click();
  await page.getByRole('textbox', { name: 'Ranges' }).fill('1-3, 10-');
  await page.getByRole('button', { name: 'Split into 2 files' }).click();

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
  await page.goto(pathOf('pdf-splitter'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();

  await page.getByRole('checkbox', { name: 'Page 2', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Page 3', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('checkbox', { name: 'Page 2', exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Page 3', exact: true }),
  ).toBeChecked();

  await page.getByRole('button', { name: 'Extract 2 pages' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: /^Download text-12\.pages-.+\.pdf$/ })
    .click();
  const bytes = readFileSync((await (await downloadPromise).path())!);
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  expect(await pdfPageTexts(new Uint8Array(bytes))).toEqual([
    'Beta 2',
    'Beta 3',
  ]);
});

test('shows a precise error for a bad range', async ({ page }) => {
  await page.goto(pathOf('pdf-splitter'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('radio', { name: 'Page ranges' }).click();
  await page.getByRole('textbox', { name: 'Ranges' }).fill('2-9');
  // Said under the field as you type; nothing to split until it is fixed.
  await expect(page.getByText('Page 9 is out of range (1–3)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Split PDF' })).toBeDisabled();
});

test('stale results disappear when settings change', async ({ page }) => {
  await page.goto(pathOf('pdf-splitter'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  await page.getByRole('radio', { name: 'Page ranges' }).click();
  await page.getByRole('textbox', { name: 'Ranges' }).fill('1-3, 10-');
  await page.getByRole('button', { name: 'Split into 2 files' }).click();
  const zipButton = page.getByRole('button', { name: 'Download all (ZIP)' });
  await expect(zipButton).toBeVisible();
  await page.getByRole('radio', { name: 'Every page' }).click();
  await expect(zipButton).toHaveCount(0);
});

test('select all and clear selection', async ({ page }) => {
  await page.goto(pathOf('pdf-splitter'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('button', { name: 'Select all' }).click();
  const checked = page.getByRole('checkbox', { checked: true });
  await expect(checked).toHaveCount(3);
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await expect(checked).toHaveCount(0);
});

test('shift-click selects a range of pages', async ({ page }) => {
  await page.goto(pathOf('pdf-splitter'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-12.pdf');
  const tiles = page
    .getByRole('list', { name: /^Pages/ })
    .getByRole('listitem');
  await expect(tiles).toHaveCount(12);
  await page.getByRole('checkbox', { name: 'Page 3', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Page 7', exact: true })
    .click({ modifiers: ['Shift'] });
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(5);
  await expect(page.getByText('(5 selected)')).toBeVisible();

  await page.getByRole('button', { name: 'Extract 5 pages' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: /^Download text-12\.pages-.+\.pdf$/ })
    .click();
  const bytes = readFileSync((await (await downloadPromise).path())!);
  expect(await pdfPageTexts(new Uint8Array(bytes))).toEqual([
    'Beta 3',
    'Beta 4',
    'Beta 5',
    'Beta 6',
    'Beta 7',
  ]);
});
