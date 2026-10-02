import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { withExifOrientation } from '../fixtures/images';
import { pathOf } from './tool-routes';

const fixture = (name: string, mimeType: string) => ({
  name,
  mimeType,
  buffer: readFileSync(`test/fixtures/generated/${name}`),
});

test('combines PNG, JPEG, WebP and GIF into one PDF in the chosen order', async ({
  page,
}) => {
  await page.goto(pathOf('images-to-pdf'));
  // Chromium can encode WebP; build a real one in the page.
  const webp = await page.evaluate(async () => {
    const c = new OffscreenCanvas(60, 40);
    const g = c.getContext('2d')!;
    g.fillStyle = '#c33';
    g.fillRect(0, 0, 60, 40);
    const blob = await c.convertToBlob({ type: 'image/webp' });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page
    .locator('input[type=file]')
    .setInputFiles([
      fixture('photo.png', 'image/png'),
      fixture('photo.jpg', 'image/jpeg'),
      fixture('tiny.gif', 'image/gif'),
      { name: 'red.webp', mimeType: 'image/webp', buffer: Buffer.from(webp) },
    ]);
  const rows = page.locator('li[data-sortable-item]');
  await expect(rows).toHaveCount(4);
  for (const name of ['photo.png', 'photo.jpg', 'tiny.gif', 'red.webp']) {
    await expect(page.getByRole('img', { name, exact: true })).toBeVisible();
  }

  // Move red.webp to the top with the keyboard.
  const webpRow = page.locator('li[data-sortable-item]', {
    hasText: 'red.webp',
  });
  for (let i = 0; i < 3; i++) {
    await webpRow.focus();
    await page.keyboard.press('Alt+ArrowUp');
  }
  await expect(rows.first()).toContainText('red.webp');

  await page.getByLabel('Page size', { exact: true }).selectOption('fit');
  await page.getByLabel('Margin (mm)', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Create PDF' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download red.pdf', exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('red.pdf');

  const doc = await PDFDocument.load(readFileSync((await download.path())!));
  // Fit to image at 96 DPI: px × 0.75 = pt.
  expect(doc.getPages().map((p) => [p.getWidth(), p.getHeight()])).toEqual([
    [45, 30],
    [240, 150],
    [300, 225],
    [30, 22.5],
  ]);
  const imageOf = (i: number) => {
    const xo = doc
      .getPage(i)
      .node.Resources()!
      .lookup(PDFName.of('XObject'), PDFDict);
    return xo.lookup(xo.keys()[0]) as PDFRawStream;
  };
  // WebP and GIF were really converted to PNG (Flate), JPEG passed through (DCT).
  expect(imageOf(0).dict.lookup(PDFName.of('Filter'))).toEqual(
    PDFName.of('FlateDecode'),
  );
  expect(imageOf(2).dict.lookup(PDFName.of('Filter'))).toEqual(
    PDFName.of('DCTDecode'),
  );
  expect(imageOf(3).dict.lookup(PDFName.of('Filter'))).toEqual(
    PDFName.of('FlateDecode'),
  );
  // The transparent PNG keeps its alpha.
  expect(imageOf(1).dict.has(PDFName.of('SMask'))).toBe(true);
});

test('turns a sideways camera JPEG upright on an auto-oriented A4 page', async ({
  page,
}) => {
  await page.goto(pathOf('images-to-pdf'));
  // Stored 400×300 (landscape) with EXIF "rotate 90° clockwise".
  const jpg = withExifOrientation(
    readFileSync('test/fixtures/generated/photo.jpg'),
    6,
  );
  await page.locator('input[type=file]').setInputFiles({
    name: 'camera.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(jpg),
  });
  await expect(
    page.getByRole('img', { name: 'camera.jpg', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Page size', { exact: true }).selectOption('a4');
  await page.getByLabel('Orientation', { exact: true }).selectOption('auto');
  await page.getByRole('button', { name: 'Create PDF' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download camera.pdf', exact: true })
    .click();
  const doc = await PDFDocument.load(
    readFileSync((await (await downloadPromise).path())!),
  );
  const { width, height } = doc.getPage(0).getSize();
  expect(height).toBeGreaterThan(width); // shown portrait, as the browser does
});

test('names an image the browser cannot decode', async ({ page }) => {
  await page.goto(pathOf('images-to-pdf'));
  // A WebP signature followed by junk: accepted by type, fails to decode.
  const junk = Buffer.concat([
    Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 ', 'latin1'),
    Buffer.alloc(32, 7),
  ]);
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.webp',
    mimeType: 'image/webp',
    buffer: junk,
  });
  await expect(page.locator('li[data-sortable-item]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Create PDF' }).click();
  await expect(
    page.getByText('broken.webp could not be decoded as an image'),
  ).toBeVisible();
});
