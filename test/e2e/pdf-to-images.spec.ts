import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { pngDimensions } from '../fixtures/images';
import { pathOf } from './tool-routes';

test('exports selected pages as PNGs in a ZIP at the requested DPI', async ({
  page,
}) => {
  await page.goto(pathOf('pdf-to-images'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(page.getByText(/^3 pages,/)).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('150');
  await page.getByRole('textbox', { name: 'Pages to convert' }).fill('1, 3');
  await page.getByRole('button', { name: /^Convert \d+ pages? to/ }).click();
  await expect(
    page.getByText('2 files are ready', { exact: false }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all (ZIP)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.images.zip');
  const entries = unzipSync(readFileSync((await download.path())!));
  expect(Object.keys(entries).sort()).toEqual([
    'text-3.page-1.png',
    'text-3.page-3.png',
  ]);
  for (const bytes of Object.values(entries)) {
    expect(pngDimensions(bytes)).toEqual({ width: 1275, height: 1650 }); // 612×792 pt at 150 DPI
  }
});

test('exports a single page as JPEG', async ({ page }) => {
  await page.goto(pathOf('pdf-to-images'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('radio', { name: 'JPEG' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('JPEG quality', { exact: true })).toBeVisible();
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('72');
  await page.getByRole('textbox', { name: 'Pages to convert' }).fill('2');
  await page.getByRole('button', { name: /^Convert \d+ pages? to/ }).click();
  await expect(page.getByText('612 by 792 px at 72 DPI')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.page-2.jpg', exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.page-2.jpg');
  const bytes = readFileSync((await download.path())!);
  expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
});

test('reports an out-of-range page instead of exporting', async ({ page }) => {
  await page.goto(pathOf('pdf-to-images'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('textbox', { name: 'Pages to convert' }).fill('5');
  // Said under the field as you type; nothing to convert until it is fixed.
  await expect(
    page.getByRole('button', { name: 'Convert to images' }),
  ).toBeDisabled();
  await expect(page.getByText('Page 5 is out of range (1–3)')).toBeVisible();
});

test('renders a large page at 300 DPI within the canvas limit and says so', async ({
  page,
}) => {
  await page.goto(pathOf('pdf-to-images'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/a2-1.pdf');
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('300');
  await page.getByRole('button', { name: /^Convert \d+ pages? to/ }).click();
  // A2 (1191×1684 pt) at 300 DPI would be 34 MP; the cap is 16.7 MP.
  await expect(
    page.getByText('DPI (reduced to fit the size limit)', { exact: false }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download a2-1.page-1.png', exact: true })
    .click();
  const { width, height } = pngDimensions(
    readFileSync((await (await downloadPromise).path())!),
  );
  expect(width * height).toBeLessThanOrEqual(16_777_216);
  expect(width * height).toBeGreaterThan(16_000_000);
  expect(width / height).toBeCloseTo(1191 / 1684, 2);
});

test('warns before a very large export, and not for a small one', async ({
  page,
}) => {
  await page.goto(pathOf('pdf-to-images'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-300.pdf');
  await expect(page.getByText(/^300 pages,/)).toBeVisible();
  const warning = page.getByText('This needs roughly', { exact: false });
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('300');
  // A number field commits its value when you leave it.
  await page.keyboard.press('Tab');
  await expect(warning).toBeVisible();
  await page.getByRole('textbox', { name: 'Pages to convert' }).fill('1-3');
  await expect(warning).toBeHidden();
});
