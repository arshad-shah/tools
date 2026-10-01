import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { textPositions } from '../fixtures/builders';

test('numbers the selected pages as "n / total"', async ({ page }) => {
  await page.goto('/pdf-page-numbers');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByLabel('Format', { exact: true }).selectOption('n-of-total');
  await page.getByRole('tab', { name: 'Some pages' }).click();
  await page.getByLabel('Page ranges', { exact: true }).fill('2-3');
  await expect(page.getByText('Preview on page 2')).toBeVisible();
  await page.getByRole('button', { name: 'Add page numbers' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.numbered.pdf' })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.numbered.pdf');
  const bytes = new Uint8Array(readFileSync((await download.path())!));
  const line = async (i: number) =>
    (await textPositions(bytes, i)).map((t) => t.str).join(' ');
  expect(await line(0)).toBe('Alpha 1');
  expect(await line(1)).toContain('1 / 2');
  expect(await line(2)).toContain('2 / 2');
});
