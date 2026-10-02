import { expect, test } from '@playwright/test';
import { pathOf } from './tool-routes';

const upload = (name: string, text: string) => ({
  name,
  mimeType: 'text/csv',
  buffer: Buffer.from(text),
});

test('csv-viewer detects semicolons and keeps a ragged row', async ({
  page,
}) => {
  await page.goto(pathOf('csv-viewer'));
  await page
    .locator('input[type=file]')
    .setInputFiles(
      upload('prices.csv', 'name;price\nTea;1,50\nbroken\nCake;2,75\n'),
    );

  await expect(page.getByRole('columnheader', { name: /price/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Tea' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'broken' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Cake' })).toBeVisible();
  await expect(page.getByLabel('Delimiter')).toHaveValue('auto');
  await expect(page.getByText(/Detected: Semicolon/)).toBeVisible();
  await expect(page.getByText('Loaded with 1 problem row')).toBeVisible();
  await expect(page.getByText(/Row 2:/)).toBeVisible();
});

test('csv-viewer keeps leading zeros and long IDs exact', async ({ page }) => {
  await page.goto(pathOf('csv-viewer'));
  await page
    .locator('input[type=file]')
    .setInputFiles(
      upload('ids.csv', 'name,zip,id\nAda,00123,12345678901234567\n'),
    );
  await expect(page.getByRole('cell', { name: '00123' })).toBeVisible();
  await expect(
    page.getByRole('cell', { name: '12345678901234567' }),
  ).toBeVisible();
});

test('csv-viewer shows the columns of a header-only file', async ({ page }) => {
  await page.goto(pathOf('csv-viewer'));
  await page
    .locator('input[type=file]')
    .setInputFiles(upload('empty.csv', 'a,b,c\n'));
  await expect(page.getByRole('columnheader', { name: /^c/ })).toBeVisible();
  await expect(page.getByText('0 rows', { exact: true })).toBeVisible();
});

test('csv-viewer lets the user override the delimiter', async ({ page }) => {
  await page.goto(pathOf('csv-viewer'));
  await page
    .locator('input[type=file]')
    .setInputFiles(upload('data.csv', 'a|b\n1|2\n3|4\n'));
  await expect(page.getByRole('columnheader', { name: /^b/ })).toBeVisible();
  await page.getByLabel('Delimiter').selectOption(',');
  await expect(page.getByRole('columnheader', { name: /a\|b/ })).toBeVisible();
});
