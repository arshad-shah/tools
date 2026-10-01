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
