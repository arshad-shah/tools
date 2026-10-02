import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const out = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Output', exact: true });

test('loads at /encoding/text', async ({ page }) => {
  expect(pathOf('url-encoder-decoder')).toBe('/encoding/text');
  await page.goto('/encoding/text');
  await expect(
    page.getByRole('heading', { name: 'Text Encoder / Decoder' }).first(),
  ).toBeVisible();
});

test('the old /encoding/url finds Text Encoder in NotFound search', async ({
  page,
}) => {
  await page.goto('/encoding/url');
  await expect(page.getByText(/Text Encoder/).first()).toBeVisible();
});

test('copies the encoded output', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('url-encoder-decoder'));
  await page.getByRole('textbox', { name: 'Text to encode' }).fill('a b&c');
  await expect(out(page)).toHaveValue('a%20b%26c');
  await page
    .getByRole('group', { name: 'Output' })
    .getByRole('button', { name: 'Copy' })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'a%20b%26c',
  );
});

test('Punycode encodes host names', async ({ page }) => {
  await page.goto(pathOf('url-encoder-decoder'));
  await page.getByLabel('Codec').selectOption('punycode');
  await page
    .getByRole('textbox', { name: 'Text to encode' })
    .fill(`b${String.fromCodePoint(0xfc)}cher.example`);
  await expect(out(page)).toHaveValue('xn--bcher-kva.example');
});

test('decodes until stable and shows the rounds', async ({ page }) => {
  await page.goto(pathOf('url-encoder-decoder'));
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page.getByRole('textbox', { name: 'Text to decode' }).fill('%252541');
  await page.getByRole('button', { name: 'Decode until stable' }).click();
  await expect(page.getByText('Decoded in 3 rounds')).toBeVisible();
  await expect(out(page)).toHaveValue('A');
});
