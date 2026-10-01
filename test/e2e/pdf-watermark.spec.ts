import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';

test('adds a text watermark to the chosen pages with a live preview', async ({
  page,
}) => {
  await page.goto('/pdf-watermark');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByLabel('Watermark text', { exact: true }).fill('TOP SECRET');
  await expect(
    page.getByRole('img', { name: 'Watermark preview' }),
  ).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('tab', { name: 'Some pages' }).click();
  await page.getByLabel('Page ranges', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Add watermark' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.watermarked.pdf' })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.watermarked.pdf');
  const texts = await pdfPageTexts(
    new Uint8Array(readFileSync((await download.path())!)),
  );
  expect(texts[0]).not.toContain('TOP SECRET');
  expect(texts[1]).toContain('TOP SECRET');
});

test('adds an image watermark', async ({ page }) => {
  await page.goto('/pdf-watermark');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'Image' }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/photo.png');
  await expect(page.getByText('photo.png', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add watermark' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.watermarked.pdf' })
    .click();
  const doc = await PDFDocument.load(
    readFileSync((await (await downloadPromise).path())!),
  );
  for (const p of doc.getPages()) {
    expect(
      p.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict).keys(),
    ).toHaveLength(1);
  }
});
