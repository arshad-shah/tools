import { readFile } from 'node:fs/promises';
import jpeg from 'jpeg-js';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from './tool-routes';

/** A 16x16 PNG drawn by the browser: clear, or filled with `fill`. */
async function transparentPng(page: Page, fill?: string): Promise<Buffer> {
  const b64 = await page.evaluate((colour) => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    if (colour) {
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 16, 16);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, fill);
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
  await page.goto(pathOf('image-optimizer'));
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
  await page.goto(pathOf('image-optimizer'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/photo.png');
  await expect(page.getByLabel('Compression quality')).toBeVisible();
  await page.getByLabel('Output format').selectOption('png');
  await expect(page.getByLabel('Compression quality')).toHaveCount(0);
  await expect(page.getByText(/PNG is lossless/)).toBeVisible();
  await expect(page.getByLabel('Background colour')).toHaveCount(0);
});

test('image-optimizer blends semi-transparent pixels over the background', async ({
  page,
}) => {
  await page.goto(pathOf('image-optimizer'));
  const png = await transparentPng(page, 'rgba(255, 0, 0, 0.5)');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'half.png', mimeType: 'image/png', buffer: png });
  const [r, g, b] = await convertToJpeg(page);
  // 50% red over white is about (255, 128, 128).
  expect(r).toBeGreaterThan(240);
  expect(Math.abs(g - 128)).toBeLessThan(12);
  expect(Math.abs(b - 128)).toBeLessThan(12);
});
