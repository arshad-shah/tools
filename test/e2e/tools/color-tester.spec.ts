import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

test('#777 on white: AA large passes, AA normal fails, and a suggestion fixes it', async ({
  page,
}) => {
  await page.goto(pathOf('color-tester'));
  // ColorField reads typed text on Enter.
  await page.getByRole('textbox', { name: 'Background' }).fill('#ffffff');
  await page.getByRole('textbox', { name: 'Background' }).press('Enter');
  await page.getByRole('textbox', { name: 'Foreground' }).fill('#777777');
  await page.getByRole('textbox', { name: 'Foreground' }).press('Enter');
  const results = page.getByRole('group', { name: 'WCAG 2.2 results' });
  await expect(
    results.getByText('AA large: pass', { exact: true }),
  ).toBeVisible();
  await expect(
    results.getByText('AA normal: fail', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Suggest passing foreground' })
    .click();
  await expect(
    results.getByText('AA normal: pass', { exact: true }),
  ).toBeVisible();
});

test('the Tailwind export is a @theme block', async ({ page }) => {
  await page.goto(pathOf('color-tester'));
  await page.getByRole('radio', { name: 'Tailwind' }).click();
  const out = page.getByLabel('Export output').last();
  await expect(out).toContainText('@theme {');
  await expect(out).toContainText('--color-');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download export' }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  expect(text.startsWith('@theme {')).toBe(true);
});

test('extracts a palette from an image', async ({ page }) => {
  await page.goto(pathOf('color-tester'));
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 100;
    c.height = 100;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ff0000';
    g.fillRect(0, 0, 60, 100);
    g.fillStyle = '#0000ff';
    g.fillRect(60, 0, 40, 100);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page
    .getByRole('region', { name: 'Palette from an image' })
    .locator('input[type=file]')
    .setInputFiles({
      name: 'flag.png',
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    });
  const swatches = page.getByRole('radiogroup', { name: 'Extracted colours' });
  await expect(swatches.getByRole('radio', { name: /60%/ })).toBeVisible({
    timeout: 20_000,
  });
  await expect(swatches.getByRole('radio', { name: /40%/ })).toBeVisible();
  // A chosen colour can become the base colour.
  await swatches.getByRole('radio', { name: /60%/ }).click();
  await page
    .getByRole('region', { name: 'Palette from an image' })
    .getByRole('button', { name: 'Use as base' })
    .click();
  await expect(page.getByRole('textbox', { name: 'Base colour' })).toHaveValue(
    /^#f/,
  );
});

test('the colour vision select changes the simulated preview', async ({
  page,
}) => {
  await page.goto(pathOf('color-tester'));
  await expect(page.getByText('As picked')).toBeVisible();
  await page.getByRole('combobox', { name: 'Simulate colour vision' }).click();
  await page.getByRole('option', { name: 'Deutan' }).click();
  await expect(
    page.getByText('As seen with deutan colour vision'),
  ).toBeVisible();
  await expect(
    page
      .getByRole('radiogroup', { name: 'Tonal scale 50 to 950' })
      .getByRole('radio', { name: /as seen with deutan/ }),
  ).toHaveCount(11);
});
