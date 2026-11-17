import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

type Page = import('@playwright/test').Page;
/** The result CodeBlock, beside or under the input. */
const out = async (page: Page, name = 'Encoded') =>
  page.getByRole('figure', { name, exact: true });

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
  await page.getByRole('searchbox', { name: 'Search tools' }).fill('url');
  await expect(
    page
      .getByRole('region', { name: 'Search results' })
      .getByRole('link', { name: /Text Encoder \/ Decoder/ }),
  ).toBeVisible();
});

test('copies the encoded output', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('url-encoder-decoder'));
  await page.getByRole('textbox', { name: 'Text to encode' }).fill('a b&c');
  await expect(await out(page)).toHaveText(/a%20b%26c/);
  await page.getByRole('button', { name: 'Copy the output' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'a%20b%26c',
  );
});

test('Punycode encodes host names', async ({ page }) => {
  await page.goto(pathOf('url-encoder-decoder'));
  await page.getByRole('combobox', { name: 'Codec' }).click();
  await page.getByRole('option', { name: /Punycode/ }).click();
  await page
    .getByRole('textbox', { name: 'Text to encode' })
    .fill(`b${String.fromCodePoint(0xfc)}cher.example`);
  await expect(await out(page)).toHaveText(/xn--bcher-kva\.example/);
});

test('decodes until stable and shows the rounds', async ({ page }) => {
  await page.goto(pathOf('url-encoder-decoder'));
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page.getByRole('textbox', { name: 'Text to decode' }).fill('%252541');
  await page.getByRole('button', { name: 'Decode until stable' }).click();
  await expect(page.getByText('Decoded in 3 rounds')).toBeVisible();
  await expect(await out(page, 'Decoded')).toHaveText(/^Decoded.*A$/s);
});

test('a URL in the output opens in another tool', async ({ page }) => {
  await page.goto(pathOf('url-encoder-decoder'));
  await page.getByRole('radio', { name: 'Decode' }).click();
  await page
    .getByRole('textbox', { name: 'Text to decode' })
    .fill('https%3A%2F%2Fexample.com%2F%3Fq%3D1');
  await page.getByRole('button', { name: 'Open URL in' }).click();
  await page.getByRole('menuitem', { name: /URL/ }).first().click();
  await expect(page).toHaveURL(new RegExp(pathOf('url-parser')));
});
