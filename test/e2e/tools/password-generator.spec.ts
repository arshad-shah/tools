import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

const reveal = async (page: Page) => {
  await page
    .getByRole('button', { name: /^Reveal / })
    .first()
    .click();
  return (await page.locator('main code').first().textContent()) ?? '';
};

test('PIN mode makes digits without runs', async ({ page }) => {
  await page.goto(pathOf('password-generator'));
  await page.getByRole('tab', { name: 'PIN' }).click();
  const pin = await reveal(page);
  expect(pin).toMatch(/^[0-9]{6}$/);
  expect(pin).not.toMatch(/(.)\1/);
});

test('a passphrase has 6 words', async ({ page }) => {
  await page.goto(pathOf('password-generator'));
  await page.getByRole('tab', { name: 'Passphrase' }).click();
  await expect(page.getByRole('meter', { name: 'Strength' })).toBeVisible();
  const phrase = await reveal(page);
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
  await page.getByRole('tab', { name: 'Check strength' }).click();
  await page.getByLabel('Password to check').fill('password');
  await expect(page.getByRole('meter', { name: 'Score' })).toHaveAttribute(
    'aria-valuetext',
    /^0 of 4/,
  );
  expect(foreign).toEqual([]);
});

test('bulk makes a list and Mod+Enter regenerates', async ({ page }) => {
  await page.goto(pathOf('password-generator'));
  const first = await reveal(page);
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('main code').first()).not.toHaveText(first);
  await page.getByRole('button', { name: 'Generate many' }).click();
  await page.getByLabel('How many').fill('25');
  await page.getByRole('button', { name: 'Generate list' }).click();
  const list = await page
    .getByRole('textbox', { name: 'Generated list' })
    .inputValue();
  expect(new Set(list.split('\n')).size).toBe(25);
});
