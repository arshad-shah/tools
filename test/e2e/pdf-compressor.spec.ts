import { readFileSync, statSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';

const FIXTURE = 'test/fixtures/generated/images-heavy.pdf';

test('Balanced compresses images for real and reports each stage', async ({
  page,
}) => {
  await page.goto('/pdf-compressor');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await page.getByRole('tab', { name: 'Balanced' }).click();
  await page.getByRole('button', { name: 'Compress PDF' }).click();
  await expect(
    page.getByText('Images: 3 recompressed', { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('CMYK colour (1)')).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Restructure (qpdf)' }),
  ).toBeVisible();
  const promise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download images-heavy.compressed.pdf' })
    .click();
  const d = await promise;
  expect(d.suggestedFilename()).toBe('images-heavy.compressed.pdf');
  const bytes = readFileSync((await d.path())!);
  expect(bytes.length).toBeLessThan(statSync(FIXTURE).size * 0.5);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(4);
  const xo = doc
    .getPage(0)
    .node.Resources()!
    .lookup(PDFName.of('XObject'), PDFDict);
  const img = xo.lookup(xo.keys()[0]) as PDFRawStream;
  expect(img.dict.lookup(PDFName.of('Filter'))).toEqual(
    PDFName.of('DCTDecode'),
  );
  // Chromium itself decodes the new JPEG at the downsampled size.
  const size = await page.evaluate(async (arr) => {
    const b = await createImageBitmap(
      new Blob([new Uint8Array(arr)], { type: 'image/jpeg' }),
    );
    return [b.width, b.height];
  }, Array.from(img.contents));
  expect(size).toEqual([500, 375]);
});

test('changing an advanced setting switches the preset to Custom', async ({
  page,
}) => {
  await page.goto('/pdf-compressor');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await page.getByRole('tab', { name: 'Balanced' }).click();
  await page.getByRole('button', { name: 'Advanced settings' }).click();
  await page
    .getByRole('switch', { name: 'Linearize for fast web view' })
    .click();
  await expect(page.getByText('Custom', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Lossless' }).click();
  await expect(page.getByText('Custom', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('switch', { name: 'Recompress images' }),
  ).toHaveAttribute('aria-checked', 'false');
});
