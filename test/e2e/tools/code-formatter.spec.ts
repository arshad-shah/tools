import { expect, test } from '@playwright/test';
import { pathOf } from '../tool-routes';

const input = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Input' });
const output = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Output' });

test.beforeEach(async ({ page }) => {
  await page.goto(pathOf('code-formatter'));
});

test('formats minified JavaScript and switches to the Output tab', async ({
  page,
}) => {
  await input(page).fill('const a={b:1,c:[1,2]};function f(x){return x*2}');
  await expect(page.getByLabel('Language')).toContainText('Auto (JavaScript)');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Output' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(output(page)).toHaveValue(
    'const a = { b: 1, c: [1, 2] };\nfunction f(x) {\n  return x * 2;\n}\n',
  );
  await page.getByRole('tab', { name: 'Input' }).click();
  await expect(input(page)).toBeVisible();
});

test('minifying CSS shows the size before and after', async ({ page }) => {
  await page.getByLabel('Language').selectOption('css');
  await input(page).fill('.card {\n  color: #ff0000;\n  margin: 0px;\n}\n');
  await page.getByRole('button', { name: 'Minify' }).click();
  await expect(output(page)).toHaveValue('.card{color:red;margin:0}');
  await expect(page.getByText(/Before 43 B, after 25 B/)).toBeVisible();
});

test('a syntax error shows a marker on line 1', async ({ page }) => {
  await page.getByLabel('Language').selectOption('javascript');
  await input(page).fill('const = 1');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  // The error is marked in the Input pane, which stays shown.
  await expect(page.getByLabel('Error on line 1')).toBeVisible();
  await page.getByRole('tab', { name: 'Output' }).click();
  await expect(output(page)).toHaveValue('');
});

test('formats SQL with the keyboard shortcut', async ({ page }) => {
  await page.getByLabel('Language').selectOption('sql');
  await input(page).fill('select a,b from t where x=1');
  await page.keyboard.press('Escape');
  await page.getByRole('heading').first().click();
  await page.keyboard.press('ControlOrMeta+Shift+F');
  await expect(output(page)).toHaveValue(
    'SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1\n',
  );
});

test.skip('Show changes opens Text Diff with both sides', () => {
  // Waits for Part 6-C (Text Diff accepts the diff-pair hand-off); H-1
  // removes this skip.
});
