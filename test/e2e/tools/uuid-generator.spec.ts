import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

type Page = import('@playwright/test').Page;
/** The generated ids' CodeBlock ("100 IDs"). */
const ids = (page: Page) =>
  page.getByRole('figure', { name: /^\d+ IDs?$/ }).locator('code');
const idList = async (page: Page) =>
  (await ids(page).innerText())
    .trim()
    .split('\n')
    .map((l) => l.trim());
/** Chooses an option in a Cynosure Select. */
async function choose(page: Page, label: string, option: RegExp) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option }).click();
}
async function howMany(page: Page, n: string) {
  await page.getByLabel('How many').fill(n);
  await page.getByLabel('How many').press('Enter');
}

test('100 v7 ids are already in sorted order', async ({ page }) => {
  expect(pathOf('uuid-generator')).toBe('/security/uuid');
  await page.goto(pathOf('uuid-generator'));
  await choose(page, 'Version', /Version 7/);
  await howMany(page, '100');
  await expect(page.getByRole('figure', { name: '100 IDs' })).toBeVisible();
  const list = await idList(page);
  expect(list).toHaveLength(100);
  for (const id of list) expect(id).toMatch(/^[0-9a-f-]{36}$/);
  expect([...list].sort()).toEqual(list);
});

test('decoding a pasted v7 shows its date', async ({ page }) => {
  await page.goto(pathOf('uuid-generator'));
  await page
    .getByRole('textbox', { name: 'Decode an ID' })
    .fill('017F22E2-79B0-7CC3-98C4-DC0C0C07398F');
  await expect(page.getByText('UUID version 7')).toBeVisible();
  await expect(page.getByText(/2022-02-22T19:22:22\.000Z/)).toBeVisible();
});

test('downloads a CSV with 100 lines', async ({ page }) => {
  await page.goto(pathOf('uuid-generator'));
  await howMany(page, '100');
  await expect(page.getByRole('figure', { name: '100 IDs' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Download .csv' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('ids.csv');
  const lines = (await readFile(await file.path(), 'utf8')).trim().split('\n');
  expect(lines).toHaveLength(100);
});

test('v5 matches the RFC 9562 example', async ({ page }) => {
  await page.goto(pathOf('uuid-generator'));
  await choose(page, 'Version', /Version 5/);
  await expect(
    page.getByRole('heading', { name: 'Enter a name' }),
  ).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('www.example.com');
  expect(await idList(page)).toEqual(['2ed6657d-e927-568b-95e1-2665a8aea6a2']);
});
