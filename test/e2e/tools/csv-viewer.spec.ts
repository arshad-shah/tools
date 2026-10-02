import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { strFromU8, unzipSync } from 'fflate';
import { pathOf } from '../tool-routes';

const upload = (name: string, text: string | Buffer) => ({
  name,
  mimeType: 'text/csv',
  buffer: typeof text === 'string' ? Buffer.from(text) : text,
});

const open = async (page: Page, name: string, text: string | Buffer) => {
  await page.goto(pathOf('csv-viewer'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(upload(name, text));
  await expect(page.getByRole('grid', { name: 'Table data' })).toBeVisible();
};

const cell = (page: Page, text: string) =>
  page.getByRole('gridcell', { name: text, exact: true });

const NUMBERS =
  'name,n\n' +
  [5, 12, 30, 15, 2, 20, 8, 25, 1, 40]
    .map((n, i) => `item${i % 3},${n}`)
    .join('\n');

test('a semicolon CSV with ragged rows loads with the report', async ({
  page,
}) => {
  await open(page, 'prices.csv', 'name;price\nTea;1,50\nbroken\nCake;2,75\n');
  await expect(cell(page, 'Tea')).toBeVisible();
  await expect(cell(page, 'broken')).toBeVisible();
  await expect(page.getByText(/Detected: Semicolon/)).toBeVisible();
  await expect(page.getByText('Loaded with 1 problem row')).toBeVisible();
  await expect(page.getByText(/Row 2:/)).toBeVisible();
});

test('keeps leading zeros and long IDs exact', async ({ page }) => {
  await open(page, 'ids.csv', 'name,zip,id\nAda,00123,12345678901234567\n');
  await expect(cell(page, '00123')).toBeVisible();
  await expect(cell(page, '12345678901234567')).toBeVisible();
});

test('the Windows-1252 fixture shows the euro sign with encoding auto', async ({
  page,
}) => {
  await open(
    page,
    'windows-1252.csv',
    readFileSync('test/fixtures/generated/windows-1252.csv'),
  );
  const euro = String.fromCodePoint(0x20ac);
  await expect(cell(page, `3,50 ${euro}`)).toBeVisible();
  await expect(page.getByLabel('Encoding')).toContainText(
    'Auto (Windows-1252)',
  );
});

test('pasting TSV detects the tab delimiter', async ({ page }) => {
  await page.goto(pathOf('csv-viewer'));
  await page
    .getByRole('textbox', { name: 'CSV or TSV data' })
    .fill('a\tb\n1\t2\n3\t4');
  // A paste (not a keystroke) opens the table straight away.
  await expect(page.getByText(/Detected: Tab/)).toBeVisible();
  await expect(page.getByText('2 of 2 rows')).toBeVisible();
});

test('filter plus multi-sort, then the profile median', async ({ page }) => {
  await open(page, 'numbers.csv', NUMBERS);
  await page.getByRole('button', { name: 'Filter n', exact: true }).click();
  const range = page.getByRole('radio', { name: 'Range' });
  if (await range.isVisible()) await range.click();
  await page.getByLabel('Minimum').fill('10');
  await page.getByLabel('Maximum').fill('20');
  await page.keyboard.press('Escape');
  await expect(page.getByText('3 of 10 rows')).toBeVisible();
  await page.getByRole('button', { name: 'name', exact: true }).click();
  await page
    .getByRole('button', { name: 'n', exact: true })
    .click({ modifiers: ['Shift'] });
  const rows = page.getByRole('row');
  await expect(rows.nth(1)).toContainText('item0');
  await expect(rows.nth(1)).toContainText('15');
  await page.getByRole('tab', { name: 'Profile' }).click();
  await expect(page.getByText('Median 15')).toBeVisible();
});

test('edit a cell, then undo with Mod+Z', async ({ page }) => {
  await open(page, 'numbers.csv', NUMBERS);
  await cell(page, '30').dblclick();
  const editor = page.getByLabel('Edit n');
  await editor.fill('31');
  await editor.press('Enter');
  await expect(cell(page, '31')).toBeVisible();
  await expect(page.getByText('Modified')).toBeVisible();
  await page.getByRole('grid', { name: 'Table data' }).focus();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(cell(page, '30')).toBeVisible();
  await expect(page.getByText('Modified')).toHaveCount(0);
});

test('export XLSX has every row', async ({ page }) => {
  await open(page, 'numbers.csv', NUMBERS);
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Format').selectOption('xlsx');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('numbers.xlsx');
  const bytes = readFileSync(await download.path());
  const sheet = strFromU8(
    unzipSync(new Uint8Array(bytes))['xl/worksheets/sheet1.xml'],
  );
  expect(sheet.match(/<row /g)).toHaveLength(11);
});

test('rejects a non-text file inline and parses a dropped .txt', async ({
  page,
}) => {
  await page.goto(pathOf('csv-viewer'));
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('png'),
  });
  await expect(
    page.getByText('photo.png is not a supported text file (.csv, .tsv, .txt)'),
  ).toBeVisible();
  await input.setInputFiles(upload('data.txt', 'city,pop\nOslo,700000\n'));
  await expect(cell(page, 'Oslo')).toBeVisible();
});

test('a filtered CSV export is named by its row count', async ({ page }) => {
  await open(page, 'numbers.csv', NUMBERS);
  await page.getByLabel('Search all columns').fill('item1');
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Format').selectOption('csv');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('numbers-filtered-3rows.csv');
});

test('the chart tab draws a chart of the filtered rows', async ({ page }) => {
  await open(page, 'numbers.csv', NUMBERS);
  await page.getByRole('tab', { name: 'Chart' }).click();
  await expect(page.getByRole('img', { name: /chart of n/ })).toBeVisible();
  await expect(
    page.getByText(/Drawn from 10 of 10 filtered rows/),
  ).toBeVisible();
});

test('Send CSV to lists Text Diff and hands the shown rows over', async ({
  page,
}) => {
  await open(page, 'numbers.csv', NUMBERS);
  await page.getByRole('button', { name: 'Send CSV to' }).click();
  await page.getByRole('menuitem', { name: /Text Diff/ }).click();
  await expect(page).toHaveURL(/diff/);
  await expect(page.getByText('item0,5').first()).toBeAttached();
});
