import { expect, test, type Page } from '@playwright/test';
import { pathOf } from './tool-routes';

async function enter(page: Page, text: string) {
  const editor = page.locator('textarea').first();
  await editor.fill(text);
  await page.getByRole('button', { name: 'Parse', exact: true }).click();
}

test('json viewer search treats ( and [ as literal text', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathOf('json-and-xml-viewer'));
  await enter(page, '{"note": "call f(x)", "list": "[1]"}');
  await expect(page.getByText('call f(x)').first()).toBeVisible();

  const search = page.getByPlaceholder('Search lines…');
  await search.fill('(');
  await search.fill('[');
  await search.fill('f(x');
  await expect(page.getByText('Filtering: f(x')).toBeVisible();
  await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('json viewer shows the line and column of a JSON error', async ({
  page,
}) => {
  await page.goto(pathOf('json-and-xml-viewer'));
  await enter(page, '{\n  "a": 1,\n  oops\n}');
  await expect(page.getByText(/Line 3, column 3:/)).toBeVisible();
});

test('json viewer shows the line and column of an XML error', async ({
  page,
}) => {
  await page.goto(pathOf('json-and-xml-viewer'));
  await page.getByLabel('Format').selectOption('xml');
  await enter(page, '<a>\n  <b>\n</a>');
  await expect(page.getByText(/Line 3, column \d+:/)).toBeVisible();
});
