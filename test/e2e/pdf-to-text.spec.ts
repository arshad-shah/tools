import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';

test('extracts text into one file', async ({ page }) => {
  await page.goto('/pdf-to-text');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('button', { name: 'Extract text' }).click();
  await expect(page.getByLabel('Extracted text', { exact: true })).toHaveValue(
    /Alpha 3/,
  );
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.txt', exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.txt');
  expect(readFileSync((await download.path())!, 'utf8')).toBe(
    '--- Page 1 ---\nAlpha 1\n\n--- Page 2 ---\nAlpha 2\n\n--- Page 3 ---\nAlpha 3\n',
  );
});

test('flags pages without a text layer and offers per-page files', async ({
  page,
}) => {
  await page.goto('/pdf-to-text');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/shapes-2.pdf');
  await page.getByRole('button', { name: 'Extract text' }).click();
  await expect(
    page.getByText('No text layer on page(s) 1, 2.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'One file per page' }).click();
  await expect(page.getByText('2 files ready', { exact: false })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all (ZIP)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('shapes-2.text.zip');
  const entries = unzipSync(readFileSync((await download.path())!));
  expect(Object.keys(entries).sort()).toEqual([
    'shapes-2.page-1.txt',
    'shapes-2.page-2.txt',
  ]);
  // No text layer: the files exist but are empty.
  expect(Object.values(entries).map((b) => b.length)).toEqual([0, 0]);
});

test('copies the extracted text to the clipboard', async ({ page }) => {
  // Capture in the page instead of the OS clipboard, which other processes share.
  await page.addInitScript(() => {
    const w = window as unknown as { copied?: string };
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          w.copied = text;
        },
      },
    });
  });
  await page.goto('/pdf-to-text');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('button', { name: 'Extract text' }).click();
  await page.getByRole('button', { name: 'Copy text' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { copied?: string }).copied,
    ),
  ).toBe(
    '--- Page 1 ---\nAlpha 1\n\n--- Page 2 ---\nAlpha 2\n\n--- Page 3 ---\nAlpha 3\n',
  );
});
