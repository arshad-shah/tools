import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';
import { pathOf } from './tool-routes';

test('merges two PDFs honouring order and page selection', async ({ page }) => {
  await page.goto(pathOf('pdf-merger'));
  await page
    .locator('input[type=file]')
    .setInputFiles([
      'test/fixtures/generated/text-3.pdf',
      'test/fixtures/generated/text-12.pdf',
    ]);
  await expect(
    page.getByText('text-12.pdf', { exact: true }).first(),
  ).toBeVisible();

  // Every row shows page 1 as an image, rendered by the pdf.js worker.
  const rows = page
    .getByRole('list', { name: 'Files to merge' })
    .getByRole('listitem');
  await expect(rows).toHaveCount(2);
  for (const name of ['text-3.pdf', 'text-12.pdf']) {
    const img = page.getByRole('img', { name: `${name}, page 1` });
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(rows.nth(1)).toContainText('12 pages');

  // Move text-12 above text-3 with the keyboard: Space picks the row up,
  // the arrow moves it, Space drops it.
  const handle = page.getByRole('button', {
    name: 'Move text-12.pdf',
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(rows.first()).toContainText('text-12.pdf');

  await page.getByLabel('Pages from text-12.pdf').fill('1-2');
  await page.getByRole('button', { name: 'Merge 2 files' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-12.merged.pdf' })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-12.merged.pdf');
  const bytes = readFileSync((await download.path())!);
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2 + 3);
  // Order matters, not just the count: text-12's pages 1-2, then text-3.
  expect(await pdfPageTexts(new Uint8Array(bytes))).toEqual([
    'Beta 1',
    'Beta 2',
    'Alpha 1',
    'Alpha 2',
    'Alpha 3',
  ]);
});

test('rejects an invalid file by name', async ({ page }) => {
  await page.goto(pathOf('pdf-merger'));
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 not really a pdf'),
  });
  await expect(page.getByText(/broken\.pdf/).first()).toBeVisible();
  await expect(page.getByText('A file was skipped')).toBeVisible();
});

test('names the file when a page range is out of range', async ({ page }) => {
  await page.goto(pathOf('pdf-merger'));
  await page
    .locator('input[type=file]')
    .setInputFiles([
      'test/fixtures/generated/text-3.pdf',
      'test/fixtures/generated/text-12.pdf',
    ]);
  await page.getByLabel('Pages from text-3.pdf').fill('9');
  await page.getByRole('button', { name: 'Merge 2 files' }).click();
  // The error sits next to the merge button that caused it.
  await expect(
    page
      .getByRole('region', { name: 'Merge' })
      .getByText('text-3.pdf: Page 9 is out of range (1–3)'),
  ).toBeVisible();
});
