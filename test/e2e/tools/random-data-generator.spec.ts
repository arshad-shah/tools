import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const firstRowJson = async (page: Page) => {
  await page.getByRole('tab', { name: 'JSON' }).click();
  const text = await page
    .getByRole('textbox', { name: 'Generated JSON' })
    .inputValue();
  return (JSON.parse(text) as unknown[])[0];
};

const generate = async (page: Page) => {
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(
    page.getByRole('grid', { name: 'Generated data' }),
  ).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.goto(pathOf('random-data-generator'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('seed abc generates the same first row after a reload', async ({
  page,
}) => {
  await page.getByLabel('Seed', { exact: true }).fill('abc');
  await generate(page);
  const first = await firstRowJson(page);
  await page.reload();
  await page.getByLabel('Seed', { exact: true }).fill('abc');
  await generate(page);
  expect(await firstRowJson(page)).toEqual(first);
});

test('200k rows show progress and Cancel stops the job', async ({ page }) => {
  await page.getByLabel('Rows').fill('200000');
  await expect(page.getByText(/Large output: about/)).toBeVisible();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Generation progress' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByRole('grid', { name: 'Generated data' })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: 'Generate', exact: true }),
  ).toBeEnabled();
});

test('exports SQL', async ({ page }) => {
  await page.getByLabel('Rows').fill('3');
  await generate(page);
  await page.getByLabel('Format', { exact: true }).selectOption('sql');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('users.sql');
  const sql = readFileSync(await download.path(), 'utf8');
  expect(sql).toContain('INSERT INTO "users" ("id", "name", "email"');
});

test('the share link restores the schema and seed', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByLabel('Preset').selectOption('events');
  await page.getByLabel('Seed', { exact: true }).fill('shared-seed');
  await page.getByRole('button', { name: /share/i }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#s=');
  await page.goto('about:blank');
  await page.goto(url);
  await expect(page.getByText('Loaded from a shared link')).toBeVisible();
  await expect(page.getByLabel('Seed', { exact: true })).toHaveValue(
    'shared-seed',
  );
  await expect(page.getByLabel('Table name')).toHaveValue('events');
});

test('Open in CSV Viewer shows the rows', async ({ page }) => {
  await page.getByLabel('Rows').fill('4');
  await generate(page);
  await page.getByRole('button', { name: 'Open in CSV Viewer' }).click();
  await expect(page).toHaveURL(/\/data\/csv/);
  await expect(page.getByText('4 of 4 rows')).toBeVisible();
});

test('CSV Viewer hands an inferred schema over', async ({ page }) => {
  await page.goto(pathOf('csv-viewer'));
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'people.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('id,email\n1,ada@example.com\n2,bob@example.org\n'),
    });
  await page.getByRole('button', { name: 'Generate more like this' }).click();
  await expect(page).toHaveURL(/\/data\/random/);
  await expect(
    page.getByText('Schema received from another tool'),
  ).toBeVisible();
  const names = page.getByLabel('Field name');
  await expect(names).toHaveCount(2);
  await expect(names.nth(1)).toHaveValue('email');
});
