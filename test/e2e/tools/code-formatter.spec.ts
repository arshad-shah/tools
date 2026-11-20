import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';
import { expectEditorValue } from '../editor';

const input = (page: Page) => page.getByRole('textbox', { name: 'Input' });
/** The result CodeBlock's code (named by the output file, e.g. formatted.js). */
const output = (page: Page, name: string) =>
  page.getByRole('figure', { name }).locator('code');
/** Chooses a language in the Cynosure Select. */
async function language(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Language' }).click();
  await page.getByRole('option', { name, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto(pathOf('code-formatter'));
});

test('formats minified JavaScript beside the input', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'No code yet' }),
  ).toBeVisible();
  await input(page).fill('const a={b:1,c:[1,2]};function f(x){return x*2}');
  await expect(page.getByRole('combobox', { name: 'Language' })).toContainText(
    'Auto (JavaScript)',
  );
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expect(output(page, 'formatted.js')).toHaveText(
    'const a = { b: 1, c: [1, 2] };\nfunction f(x) {\n  return x * 2;\n}',
  );
  await expect(input(page)).toBeVisible();
});

test('minifying CSS shows the size before and after', async ({ page }) => {
  await language(page, 'CSS');
  await input(page).fill('.card {\n  color: #ff0000;\n  margin: 0px;\n}\n');
  await page.getByRole('button', { name: 'Minify' }).click();
  await expect(output(page, 'minified.css')).toHaveText(
    '.card{color:red;margin:0}',
  );
  await expect(page.getByText(/Before 43 B, after 25 B/)).toBeVisible();
});

test('a syntax error is named under the input', async ({ page }) => {
  await language(page, 'JavaScript');
  await input(page).fill('const = 1');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expect(page.getByText(/^Line 1(:\d+)?: /)).toBeVisible();
  await expect(input(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByRole('heading', { name: 'Ready to format' }),
  ).toBeVisible();
});

test('formats SQL with the keyboard shortcut', async ({ page }) => {
  await language(page, 'SQL');
  await input(page).fill('select a,b from t where x=1');
  await page.getByRole('heading').first().click();
  await page.keyboard.press('ControlOrMeta+Shift+F');
  await expect(output(page, 'formatted.sql')).toHaveText(
    'SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1',
  );
});

test('Minify shows only for languages it can minify', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Minify' })).toBeVisible();
  await language(page, 'Markdown');
  await expect(page.getByRole('button', { name: 'Minify' })).toHaveCount(0);
});

test('an example loads from the menu', async ({ page }) => {
  // Offered once, in the empty Output card.
  await page.getByRole('button', { name: 'Try an example' }).click();
  await page.getByRole('menuitem', { name: 'SQL' }).click();
  await expectEditorValue(input(page), /^select id,name from users/);
});
