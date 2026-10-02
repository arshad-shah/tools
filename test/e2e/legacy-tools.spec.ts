import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from './tool-routes';

test('color-tester exports the palette as JSON', async ({ page }) => {
  await page.goto(pathOf('color-tester'));
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('color-palette.json');
  const body: unknown = JSON.parse(await readFile(await file.path(), 'utf8'));
  expect(Array.isArray(body)).toBe(true);
});

test('image-optimizer converts and downloads', async ({ page }) => {
  await page.goto(pathOf('image-optimizer'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/photo.png');
  await expect(page.getByText(/^\d+ × \d+px$/)).toBeVisible();
  await page.getByRole('button', { name: 'Convert & compress' }).click();
  await expect(page.getByText('Processing complete')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  expect((await download).suggestedFilename()).toBe('photo.optimized.jpeg');
});

test('image-optimizer converts an SVG', async ({ page }) => {
  await page.goto(pathOf('image-optimizer'));
  await page.locator('input[type=file]').setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="red"/></svg>',
    ),
  });
  await expect(page.getByText('40 × 20px')).toBeVisible();
  await page.getByRole('button', { name: 'Convert & compress' }).click();
  await expect(page.getByText('Processing complete')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  expect((await download).suggestedFilename()).toBe('logo.optimized.jpeg');
});

test('image-optimizer rejects non-images inline', async ({ page }) => {
  await page.goto(pathOf('image-optimizer'));
  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hi'),
  });
  await expect(page.getByText('notes.txt is not an image')).toBeVisible();
});

test('text-diff-checker loads a file into the left pane', async ({ page }) => {
  await page.goto(pathOf('text-diff-checker'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'left.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello left'),
    });
  await expect(page.getByText('left.txt loaded successfully')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Original text' }),
  ).toHaveValue('hello left');
});

test('rive-animation-player rejects a non-Rive file with a toast', async ({
  page,
}) => {
  await page.goto(pathOf('rive-animation-player'));
  await page.locator('input[type=file]').setInputFiles({
    name: 'fake.riv',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('nope'),
  });
  await expect(
    page
      .locator('[data-sonner-toast]')
      .getByText('fake.riv is not a Rive (.riv) file'),
  ).toBeVisible();
});

test('calculator plots an expression without crashing', async ({ page }) => {
  await page.goto(pathOf('calculator'));
  await page.getByRole('radio', { name: 'Grapher' }).click();
  await page.getByRole('textbox', { name: 'f1(x) =' }).fill('sin(x)');
  await expect(
    page.getByRole('img', { name: 'Graph of the functions' }),
  ).toBeVisible();
  await expect(page.getByText('Calculator encountered an error')).toHaveCount(
    0,
  );
});
