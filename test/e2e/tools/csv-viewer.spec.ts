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
  await page.getByRole('button', { name: /Parse options/ }).click();
  await expect(page.getByRole('combobox', { name: 'Encoding' })).toContainText(
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

const view = (page: Page, name: string) =>
  page
    .getByRole('radiogroup', { name: 'View' })
    .getByRole('radio', { name })
    .check();

const exportAs = async (page: Page, label: string) => {
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('combobox', { name: 'Format' }).click();
  await page.getByRole('option', { name: label }).click();
};

test('filter plus sort, then the profile median', async ({ page }) => {
  await open(page, 'numbers.csv', NUMBERS);
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByLabel('n minimum').fill('10');
  await page.getByLabel('n maximum').fill('20');
  await page.keyboard.press('Escape');
  await expect(page.getByText('3 of 10 rows')).toBeVisible();
  await page
    .getByRole('columnheader', { name: 'n', exact: true })
    .getByRole('button')
    .click();
  const rows = page.getByRole('grid', { name: 'Table data' }).getByRole('row');
  await expect(rows.nth(1)).toContainText('12');
  await expect(rows.nth(3)).toContainText('20');
  await view(page, 'Profile');
  await expect(
    page
      .locator(
        'xpath=//dt[normalize-space()="Median"]/following-sibling::dd[1]',
      )
      .last(),
  ).toHaveText('15');
});

test('edit a cell, then undo with Mod+Z', async ({ page }) => {
  await open(page, 'numbers.csv', NUMBERS);
  await cell(page, '30').dblclick();
  const editor = page
    .getByRole('dialog', { name: 'Edit row 3' })
    .getByRole('textbox', { name: 'n', exact: true });
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
  await exportAs(page, 'Excel (XLSX)');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download', exact: true }).click(),
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
  await exportAs(page, 'CSV');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('numbers-filtered-3rows.csv');
});

test('the chart tab draws a chart of the filtered rows', async ({ page }) => {
  await open(page, 'numbers.csv', NUMBERS);
  await view(page, 'Chart');
  await expect(page.getByRole('img', { name: /chart of n/ })).toBeVisible();
  await expect(
    page.getByText(/Drawn from 10 of 10 filtered rows/),
  ).toBeVisible();
});

test('Send to lists Text Diff for the rows as CSV and hands them over', async ({
  page,
}) => {
  await open(page, 'numbers.csv', NUMBERS);
  await page.getByRole('button', { name: 'Send to' }).click();
  await page
    .getByRole('group', { name: 'Rows as CSV' })
    .getByRole('menuitem', { name: /Text Diff/ })
    .click();
  await expect(page).toHaveURL(/diff/);
  await expect(page.getByText('item0,5').first()).toBeAttached();
});
