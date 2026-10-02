import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const ids = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Generated IDs' });

test('100 v7 ids are already in sorted order', async ({ page }) => {
  expect(pathOf('uuid-generator')).toBe('/security/uuid');
  await page.goto(pathOf('uuid-generator'));
  await page.getByLabel('Version').selectOption('v7');
  await page.getByLabel('How many').fill('100');
  await expect(ids(page)).toHaveValue(/^([0-9a-f-]{36}\n){99}[0-9a-f-]{36}$/);
  const list = (await ids(page).inputValue()).split('\n');
  expect([...list].sort()).toEqual(list);
});

test('decoding a pasted v7 shows its date', async ({ page }) => {
  await page.goto(pathOf('uuid-generator'));
  await page
    .getByLabel('Decode an ID')
    .fill('017F22E2-79B0-7CC3-98C4-DC0C0C07398F');
  await expect(page.getByText('UUID version 7')).toBeVisible();
  await expect(page.getByText(/2022-02-22T19:22:22\.000Z/)).toBeVisible();
});

test('downloads a CSV with 100 lines', async ({ page }) => {
  await page.goto(pathOf('uuid-generator'));
  await page.getByLabel('How many').fill('100');
  await expect(ids(page)).toHaveValue(/(\n[^\n]+){99}/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .csv' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('ids.csv');
  const lines = (await readFile(await file.path(), 'utf8')).trim().split('\n');
  expect(lines).toHaveLength(100);
});

test('v5 matches the RFC 9562 example', async ({ page }) => {
  await page.goto(pathOf('uuid-generator'));
  await page.getByLabel('Version').selectOption('v5');
  await page.getByLabel('Name', { exact: true }).fill('www.example.com');
  await expect(ids(page)).toHaveValue('2ed6657d-e927-568b-95e1-2665a8aea6a2');
});
