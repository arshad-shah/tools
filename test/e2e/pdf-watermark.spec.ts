import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
} from 'pdf-lib';
import { imagePlacements, pdfPageTexts } from '../fixtures/builders';
import { pathOf } from './tool-routes';

test('adds a text watermark to the chosen pages with a live preview', async ({
  page,
}) => {
  await page.goto(pathOf('pdf-watermark'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByLabel('Watermark text', { exact: true }).fill('TOP SECRET');
  await expect(
    page.getByRole('img', { name: 'Watermark preview' }),
  ).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('tab', { name: 'Some pages' }).click();
  await page.getByLabel('Page ranges', { exact: true }).fill('2');
  await page
    .getByRole('button', { name: 'Add watermark', exact: true })
    .click();
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
  await page.goto(pathOf('pdf-watermark'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'Image' }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/photo.png');
  await expect(page.getByText('photo.png', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Add watermark', exact: true })
    .click();
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

test('checks page ranges as you type', async ({ page }) => {
  await page.goto(pathOf('pdf-watermark'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'Some pages' }).click();
  const apply = page.getByRole('button', {
    name: 'Add watermark',
    exact: true,
  });
  await expect(apply).toBeDisabled(); // nothing entered yet
  await page.getByLabel('Page ranges', { exact: true }).fill('9');
  await expect(
    page.getByRole('alert').getByText('Page 9 is out of range (1–3)'),
  ).toBeVisible();
  await expect(apply).toBeDisabled();
  await page.getByLabel('Page ranges', { exact: true }).fill('1-2');
  await expect(apply).toBeEnabled();
});

test('draws a sideways phone photo (EXIF orientation) upright', async ({
  page,
}) => {
  await page.goto(pathOf('pdf-watermark'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'Image' }).click();
  await page.getByLabel('Rotation', { exact: true }).fill('0');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/signature-exif6.jpg');
  await expect(
    page.getByText('signature-exif6.jpg', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Add watermark', exact: true })
    .click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.watermarked.pdf' })
    .click();
  const bytes = new Uint8Array(
    readFileSync((await (await downloadPromise).path())!),
  );
  const [placed] = await imagePlacements(bytes, 0);
  expect(placed.upright).toBe(true);
  expect(placed.height / placed.width).toBeCloseTo(3, 1);
  const doc = await PDFDocument.load(bytes);
  const xo = doc
    .getPage(0)
    .node.Resources()!
    .lookup(PDFName.of('XObject'), PDFDict);
  const img = xo.lookup(xo.keys()[0]) as PDFRawStream;
  const size = (k: string) =>
    img.dict.lookup(PDFName.of(k), PDFNumber).asNumber();
  expect([size('Width'), size('Height')]).toEqual([100, 300]);
});
