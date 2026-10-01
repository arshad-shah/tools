import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { pngDimensions } from '../fixtures/images';

test('exports selected pages as PNGs in a ZIP at the requested DPI', async ({
  page,
}) => {
  await page.goto('/pdf-to-images');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(page.getByText('3 pages', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Page 1', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('150');
  await page.getByLabel('Pages', { exact: true }).fill('1, 3');
  await page.getByRole('button', { name: 'Convert to images' }).click();
  await expect(page.getByText('2 files ready', { exact: false })).toBeVisible();

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
  await page.goto('/pdf-to-images');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'JPEG' }).click();
  await expect(page.getByLabel('JPEG quality', { exact: true })).toBeVisible();
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('72');
  await page.getByLabel('Pages', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Convert to images' }).click();
  await expect(page.getByText('612×792 px · 72 DPI')).toBeVisible();
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
  await page.goto('/pdf-to-images');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByLabel('Pages', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Convert to images' }).click();
  await expect(page.getByText('Page 5 is out of range (1–3)')).toBeVisible();
});

test('renders a large page at 300 DPI within the canvas limit and says so', async ({
  page,
}) => {
  await page.goto('/pdf-to-images');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/a2-1.pdf');
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('300');
  await page.getByRole('button', { name: 'Convert to images' }).click();
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
  await page.goto('/pdf-to-images');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-300.pdf');
  await expect(page.getByText('300 pages', { exact: true })).toBeVisible();
  const warning = page.getByText('This export needs roughly', { exact: false });
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('300');
  await expect(warning).toBeVisible();
  await page.getByLabel('Pages', { exact: true }).fill('1-3');
  await expect(warning).toBeHidden();
});
