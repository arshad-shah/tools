import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

/** The generated value: a masked, read-only field. */
const generated = (page: Page, label = 'password') =>
  page.getByLabel(`Generated ${label}`, { exact: true });

test('PIN mode makes digits without runs', async ({ page }) => {
  await page.goto(pathOf('password-generator'));
  await page.getByRole('radio', { name: 'PIN' }).click();
  await page.getByRole('button', { name: 'Show the PIN' }).click();
  const pin = await generated(page, 'PIN').inputValue();
  expect(pin).toMatch(/^[0-9]{6}$/);
  expect(pin).not.toMatch(/(.)\1/);
});

test('a passphrase has 6 words', async ({ page }) => {
  await page.goto(pathOf('password-generator'));
  await page.getByRole('radio', { name: 'Passphrase' }).click();
  await expect(page.getByRole('meter', { name: 'Strength' })).toBeVisible();
  const phrase = await generated(page, 'passphrase').inputValue();
  expect(phrase.split('-')).toHaveLength(6);
  await expect(page.getByRole('meter', { name: 'Strength' })).toHaveAttribute(
    'aria-valuetext',
    /78 bits/,
  );
});

test('the checker scores "password" 0 with only same-origin requests', async ({
  page,
  baseURL,
}) => {
  const foreign: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(baseURL!) && !r.url().startsWith('data:'))
      foreign.push(r.url());
  });
  await page.goto(pathOf('password-generator'));
  await page.getByRole('radio', { name: 'Check strength' }).click();
  await page.getByLabel('Password to check', { exact: true }).fill('password');
  await expect(page.getByRole('meter', { name: 'Score' })).toHaveAttribute(
    'aria-valuetext',
    /^0 of 4/,
  );
  expect(foreign).toEqual([]);
});

test('bulk makes a list and Mod+Enter regenerates', async ({ page }) => {
  await page.goto(pathOf('password-generator'));
  await page.getByRole('radio', { name: 'Password' }).click();
  const first = await generated(page).inputValue();
  await page.getByRole('heading').first().click();
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(generated(page)).not.toHaveValue(first);
  await page.getByRole('button', { name: 'Generate many' }).click();
  await page.getByLabel('How many').fill('25');
  await page.getByLabel('How many').press('Enter');
  await page.getByRole('button', { name: 'Generate list' }).click();
  const list = await page
    .getByRole('figure', { name: 'Generated list' })
    .locator('code')
    .innerText();
  expect(new Set(list.trim().split('\n')).size).toBe(25);
});
