import { expect, test } from '@playwright/test';

const upload = (name: string, text: string) => ({
  name,
  mimeType: 'text/csv',
  buffer: Buffer.from(text),
});

test('csv-viewer detects semicolons and keeps rows around a bad one', async ({
  page,
}) => {
  await page.goto('/csv-viewer');
  await page
    .locator('input[type=file]')
    .setInputFiles(
      upload('prices.csv', 'name;price\nTea;1,50\nbroken\nCake;2,75\n'),
    );

  await expect(page.getByRole('columnheader', { name: /price/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Tea' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cake' })).toBeVisible();
  await expect(page.getByLabel('Delimiter')).toHaveValue('auto');
  await expect(page.getByText(/Detected: Semicolon/)).toBeVisible();
  await expect(page.getByText(/1 row skipped/)).toBeVisible();
  await expect(page.getByText(/Row 2:/)).toBeVisible();
});

test('csv-viewer lets the user override the delimiter', async ({ page }) => {
  await page.goto('/csv-viewer');
  await page
    .locator('input[type=file]')
    .setInputFiles(upload('data.csv', 'a|b\n1|2\n3|4\n'));
  await expect(page.getByRole('columnheader', { name: /^b/ })).toBeVisible();
  await page.getByLabel('Delimiter').selectOption(',');
  await expect(page.getByRole('columnheader', { name: /a\|b/ })).toBeVisible();
});
