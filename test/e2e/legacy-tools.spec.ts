import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('color-tester exports the palette as JSON', async ({ page }) => {
  await page.goto('/color-tester');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('color-palette.json');
  const body: unknown = JSON.parse(await readFile(await file.path(), 'utf8'));
  expect(Array.isArray(body)).toBe(true);
});

test('qr-code-generator downloads a PNG', async ({ page }) => {
  await page.goto('/qr-code-generator');
  await page.getByRole('textbox').first().fill('https://example.com');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download QR code' }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^qrcode-[a-z]+-\d+\.png$/,
  );
});

test('url-encoder-decoder copies output', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/url-encoder-decoder');
  await page.getByRole('textbox').first().fill('a b&c');
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'a%20b%26c',
  );
});

test('jwt-decode shows "Copied" only on the button pressed', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/jwt-decode');
  await page.getByRole('tab', { name: 'Signature' }).click();
  await page.getByText('Signature value').click();
  const copy = page.getByRole('button', { name: 'Copy', exact: true });
  await expect(copy).toHaveCount(2); // token + signature
  await copy.last().click();
  await expect(page.getByRole('button', { name: 'Copied' })).toHaveCount(1);
  await expect(copy).toHaveCount(1);
});

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test('image-optimizer converts and downloads', async ({ page }) => {
  await page.goto('/image-optimizer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'dot.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_1PX, 'base64'),
  });
  await expect(page.getByText('1 × 1px')).toBeVisible();
  await page.getByRole('button', { name: 'Convert & compress' }).click();
  await expect(page.getByText('Processing complete')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  expect((await download).suggestedFilename()).toBe('dot.optimized.jpeg');
});

test('image-optimizer rejects non-images inline', async ({ page }) => {
  await page.goto('/image-optimizer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hi'),
  });
  await expect(page.getByText('notes.txt is not an image')).toBeVisible();
});
