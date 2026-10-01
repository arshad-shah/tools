import { readFile } from 'node:fs/promises';
import jpeg from 'jpeg-js';
import { expect, test, type Page } from '@playwright/test';

/** A fully transparent 16x16 PNG, drawn by the browser itself. */
async function transparentPng(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}

async function convertToJpeg(page: Page): Promise<number[]> {
  await page.getByRole('button', { name: 'Convert & compress' }).click();
  await expect(page.getByText('Processing complete')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  const bytes = await readFile(await (await download).path());
  const { data } = jpeg.decode(bytes, { useTArray: true });
  return [data[0], data[1], data[2]];
}

test('image-optimizer paints transparency on white, or a chosen colour, for JPEG', async ({
  page,
}) => {
  await page.goto('/image-optimizer');
  const png = await transparentPng(page);
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'clear.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByLabel('Background colour')).toHaveValue('#ffffff');

  const [r, g, b] = await convertToJpeg(page);
  expect(Math.min(r, g, b)).toBeGreaterThan(245);

  await page.getByLabel('Background colour').fill('#ff0000');
  const [r2, g2, b2] = await convertToJpeg(page);
  expect(r2).toBeGreaterThan(230);
  expect(Math.max(g2, b2)).toBeLessThan(30);
});

test('image-optimizer hides quality for lossless PNG and explains why', async ({
  page,
}) => {
  await page.goto('/image-optimizer');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/photo.png');
  await expect(page.getByLabel('Compression quality')).toBeVisible();
  await page.getByLabel('Output format').selectOption('png');
  await expect(page.getByLabel('Compression quality')).toHaveCount(0);
  await expect(page.getByText(/PNG is lossless/)).toBeVisible();
  await expect(page.getByLabel('Background colour')).toHaveCount(0);
});
