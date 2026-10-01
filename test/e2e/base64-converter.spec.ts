import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('base64-converter encodes and decodes Unicode text', async ({ page }) => {
  await page.goto('/base64-converter');
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
  await page.goto('/base64-converter');
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
  await page.goto('/base64-converter');
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
  await page.goto('/base64-converter');
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
