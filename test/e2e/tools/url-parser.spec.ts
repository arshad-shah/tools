import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const input = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'URL', exact: true });

test('editing a param rebuilds the URL', async ({ page }) => {
  await page.goto(pathOf('url-parser'));
  await input(page).fill('https://shop.test/list?page=1&sort=asc');
  await page.getByRole('tab', { name: /Query/ }).click();
  await page.getByRole('textbox', { name: 'Value, row 1' }).fill('2 3');
  await expect(input(page)).toHaveValue(
    'https://shop.test/list?page=2%203&sort=asc',
  );
});

test('Clean URL removes utm_* params', async ({ page }) => {
  await page.goto(pathOf('url-parser'));
  await input(page).fill(
    'https://news.test/a?utm_source=x&id=7&utm_medium=y&fbclid=z',
  );
  await page.getByRole('tab', { name: 'Clean URL' }).click();
  await page.getByRole('button', { name: 'Clean URL' }).click();
  await expect(input(page)).toHaveValue('https://news.test/a?id=7');
});

test('Send to HTTP Client prefills the GET with params', async ({ page }) => {
  await page.goto(pathOf('url-parser'));
  await input(page).fill('https://api.tools.test/items?q=1&lang=en');
  await page.getByRole('button', { name: 'Send to HTTP Client' }).click();
  await expect(page).toHaveURL(new RegExp(pathOf('api-request')));
  await expect(page.getByRole('textbox', { name: 'Request URL' })).toHaveValue(
    'https://api.tools.test/items',
  );
  await expect(page.getByRole('textbox', { name: 'Key, row 2' })).toHaveValue(
    'lang',
  );
});

test('Make QR opens the generator with the URL', async ({ page }) => {
  await page.goto(pathOf('url-parser'));
  await input(page).fill('https://example.org/qr');
  await page.getByRole('button', { name: 'Make QR' }).click();
  await expect(page).toHaveURL(new RegExp(pathOf('qr-code-generator')));
  await expect(page.getByLabel('Encoded text')).toHaveText(
    'https://example.org/qr',
  );
});

test('the share link round-trips without the password', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('url-parser'));
  await input(page).fill('https://ada:secret@example.org/p?x=1');
  await page.getByRole('button', { name: 'Share link' }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#s=1.');
  await page.goto('about:blank');
  await page.goto(link);
  await expect(input(page)).toHaveValue('https://ada@example.org/p?x=1');
});
