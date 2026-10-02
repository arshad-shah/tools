import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

/** A noisy PNG drawn by the browser (noise keeps encoders honest about size). */
async function noisyPng(page: Page, w: number, h: number, seed: number) {
  const b64 = await page.evaluate(
    ([w, h, seed]) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d')!;
      const img = g.createImageData(w, h);
      let s = seed;
      for (let i = 0; i < img.data.length; i += 4) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        img.data[i] = s & 255;
        img.data[i + 1] = (s >> 8) & 255;
        img.data[i + 2] = (i / 4) % 256;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    },
    [w, h, seed],
  );
  return Buffer.from(b64, 'base64');
}

/** Decodes bytes in the page; resolves to the decoded size. */
const decodeSize = (page: Page, bytes: Uint8Array, type: string) =>
  page.evaluate(
    async ([b64, type]) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bin], { type }));
      return { width: bmp.width, height: bmp.height };
    },
    [Buffer.from(bytes).toString('base64'), type],
  );

function sameOriginOnly(page: Page): string[] {
  const foreign: string[] = [];
  const origin = new URL(page.url() || 'http://localhost').origin;
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== origin)
      foreign.push(r.url());
  });
  return foreign;
}

const doneRows = (page: Page) =>
  page
    .getByRole('grid', { name: 'Files' })
    .getByText(/^(Done|Not smaller|Kept original)/);

test('a batch of three resized to 800 px as WebP downloads as a ZIP of three 800 px WebPs', async ({
  page,
}) => {
  await page.goto(pathOf('image-optimizer'));
  const foreign = sameOriginOnly(page);
  await page.getByLabel('Format').selectOption('webp');
  await page.getByRole('radio', { name: 'Max size' }).click();
  await page.getByLabel('Max width (px)').fill('800');
  await page.getByLabel('Max height (px)').fill('0');
  const files = await Promise.all(
    [1, 2, 3].map(async (i) => ({
      name: `shot-${i}.png`,
      mimeType: 'image/png',
      buffer: await noisyPng(page, 1600, 1000, i),
    })),
  );
  await page.locator('input[type=file]').first().setInputFiles(files);
  await expect(doneRows(page)).toHaveCount(3, { timeout: 30_000 });
  await expect(page.getByText('Metadata removed (EXIF, GPS)')).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all as ZIP' }).click();
  const zip = unzipSync(
    new Uint8Array(await readFile(await (await download).path())),
  );
  const names = Object.keys(zip).sort();
  expect(names).toEqual(['shot-1.webp', 'shot-2.webp', 'shot-3.webp']);
  for (const n of names) {
    expect(new TextDecoder().decode(zip[n].subarray(8, 12))).toBe('WEBP');
    expect(await decodeSize(page, zip[n], 'image/webp')).toEqual({
      width: 800,
      height: 500,
    });
  }
  expect(foreign).toEqual([]);
});

test('a target size reports whether it was met', async ({ page }) => {
  await page.goto(pathOf('image-optimizer'));
  await page.getByLabel('Format').selectOption('jpeg');
  await page.getByLabel('Target size (KB)').fill('50');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: await noisyPng(page, 1200, 900, 7),
    });
  await expect(doneRows(page)).toHaveCount(1, { timeout: 30_000 });
  // Pure noise cannot reach 50 KB at 1200x900: the honest note says so.
  await expect(page.getByText(/Could not reach 50/)).toBeVisible();
});

test('AVIF output decodes in the browser and its encoder loads from this site', async ({
  page,
}) => {
  await page.goto(pathOf('image-optimizer'));
  const foreign = sameOriginOnly(page);
  await page.getByLabel('Format').selectOption('avif');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'small.png',
      mimeType: 'image/png',
      buffer: await noisyPng(page, 64, 48, 3),
    });
  await expect(doneRows(page)).toHaveCount(1, { timeout: 60_000 });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all as ZIP' }).click();
  const zip = unzipSync(
    new Uint8Array(await readFile(await (await download).path())),
  );
  const avif = zip['small.avif'];
  expect(new TextDecoder().decode(avif.subarray(4, 8))).toBe('ftyp');
  expect(await decodeSize(page, avif, 'image/avif')).toEqual({
    width: 64,
    height: 48,
  });
  expect(foreign).toEqual([]);
});

test('Images to PDF receives the compressed files', async ({ page }) => {
  await page.goto(pathOf('image-optimizer'));
  await page.getByLabel('Format').selectOption('jpeg');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'scan.png',
      mimeType: 'image/png',
      buffer: await noisyPng(page, 200, 300, 9),
    });
  await expect(doneRows(page)).toHaveCount(1, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Open in' }).click();
  await page.getByRole('menuitem', { name: 'Images to PDF' }).click();
  await expect(page).toHaveURL(/\/pdf\/images-to-pdf$/);
  await expect(page.getByText('scan.jpg')).toBeVisible();
});

test('JPEG paints transparency on the chosen background', async ({ page }) => {
  await page.goto(pathOf('image-optimizer'));
  await page.getByLabel('Format').selectOption('jpeg');
  const clear = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    return c.toDataURL('image/png').split(',')[1];
  });
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'clear.png',
      mimeType: 'image/png',
      buffer: Buffer.from(clear, 'base64'),
    });
  await expect(doneRows(page)).toHaveCount(1, { timeout: 30_000 });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all as ZIP' }).click();
  const zip = unzipSync(
    new Uint8Array(await readFile(await (await download).path())),
  );
  const px = await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(
      new Blob([bin], { type: 'image/jpeg' }),
    );
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const g = c.getContext('2d')!;
    g.drawImage(bmp, 0, 0);
    return [...g.getImageData(8, 8, 1, 1).data];
  }, Buffer.from(zip['clear.jpg']).toString('base64'));
  expect(Math.min(px[0], px[1], px[2])).toBeGreaterThan(245);
});
