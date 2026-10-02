import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from './tool-routes';

test('base64-converter encodes and decodes Unicode text', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page.getByLabel('Text to encode').fill('€ café ✓');
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue(
    '4oKsIGNhZsOpIOKckw==',
  );

  await page.getByRole('tab', { name: 'Decode' }).click();
  await page.getByLabel('Base64 to decode').fill('4oKsIGNhZsOpIOKckw==');
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue(
    '€ café ✓',
  );
});

test('base64-converter has a URL-safe variant', async ({ page }) => {
  await page.goto(pathOf('base64-converter'));
  await page.getByLabel('Text to encode').fill('\u{1F600}?>');
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue(
    '8J+YgD8+',
  );
  await page.getByRole('switch', { name: 'URL-safe' }).click();
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue(
    '8J-YgD8-',
  );
});

test('base64-converter encodes a file to Base64 and a data URI', async ({
  page,
}) => {
  await page.goto(pathOf('base64-converter'));
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/tiny.gif');
  const expected = (
    await readFile('test/fixtures/generated/tiny.gif')
  ).toString('base64');
  await expect(page.getByLabel('Result', { exact: true })).toHaveValue(
    expected,
  );
  await expect(page.getByLabel('Data URI', { exact: true })).toHaveValue(
    `data:image/gif;base64,${expected}`,
  );
});

test('base64-converter decodes Base64 to a downloadable file', async ({
  page,
}) => {
  const gif = await readFile('test/fixtures/generated/tiny.gif');
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('tab', { name: 'Decode' }).click();
  await page
    .getByLabel('Base64 to decode')
    .fill(`data:image/gif;base64,${gif.toString('base64')}`);
  await expect(page.getByText(/Binary data/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('decoded.gif');
  expect(await readFile(await file.path())).toEqual(gif);
});

test('base64-converter previews a large file but downloads all of it', async ({
  page,
}) => {
  const big = randomBytes(2 * 1024 * 1024);
  await page.goto(pathOf('base64-converter'));
  await page.locator('input[type=file]').setInputFiles({
    name: 'big.bin',
    mimeType: 'application/octet-stream',
    buffer: big,
  });
  await expect(
    page.getByText(/Showing the first 64 KB of/).first(),
  ).toBeVisible();
  const shown = await page.getByLabel('Result', { exact: true }).inputValue();
  expect(shown.length).toBe(64 * 1024);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .txt' }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  expect(text).toBe(big.toString('base64'));
});

test('base64-converter decodes a percent-encoded binary data URI', async ({
  page,
}) => {
  await page.goto(pathOf('base64-converter'));
  await page.getByRole('tab', { name: 'Decode' }).click();
  await page
    .getByLabel('Base64 to decode')
    .fill('data:application/octet-stream,%FF%00%01');
  await expect(page.getByText(/Binary data \(3 B/)).toBeVisible();
});
