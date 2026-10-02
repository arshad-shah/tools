import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';

/** R41: "Test text" and "Results" are tabs. */
const show = (page: Page, name: 'Test text' | 'Results') =>
  page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();

test('regex-tester survives catastrophic backtracking', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto(pathOf('regex-tester'));
  await page
    .getByRole('textbox', { name: 'Test string' })
    .fill('a'.repeat(40) + 'b');
  await page.getByLabel('Regex pattern').fill('(a+)+$');
  await show(page, 'Results');

  await expect(page.getByText(/Pattern took too long/)).toBeVisible({
    timeout: 5000,
  });

  // The tab is still responsive and a fresh worker takes over.
  await page.getByLabel('Regex pattern').fill('a');
  await expect(page.getByText('40 matches').first()).toBeVisible();
  await expect(page.getByText(/Pattern took too long/)).toHaveCount(0);
});

test('regex-tester copies working JavaScript for a pattern with a slash', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('regex-tester'));
  await page
    .getByRole('textbox', { name: 'Test string' })
    .fill("it's a/b\nand a/b");
  await page.getByLabel('Regex pattern').fill('a/b');
  await show(page, 'Results');
  await expect(page.getByText('2 matches').first()).toBeVisible();

  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByText('Copy as JavaScript').click();
  const count = await page.evaluate(async () => {
    const code = await navigator.clipboard.readText();
    return (new Function(`${code}\nreturn matches.length;`) as () => number)();
  });
  expect(count).toBe(2);

  await page.getByRole('button', { name: 'Copy regex with flags' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    '/a\\/b/g',
  );
});

test('regex-tester shows syntax errors without running the pattern', async ({
  page,
}) => {
  await page.goto(pathOf('regex-tester'));
  await page.getByRole('textbox', { name: 'Test string' }).fill('abc');
  await page.getByLabel('Regex pattern').fill('(');
  await expect(page.getByText('Invalid', { exact: true })).toBeVisible();
  await expect(page.getByText(/Unterminated group/)).toBeVisible();
});

test('regex-tester replaces with group references', async ({ page }) => {
  await page.goto(pathOf('regex-tester'));
  await page.getByRole('textbox', { name: 'Test string' }).fill('a1 b22');
  await page.getByLabel('Regex pattern').fill('(\\d+)');
  await show(page, 'Results');
  await page.getByRole('tab', { name: 'Replace' }).click();
  await page.getByRole('textbox', { name: 'Replacement' }).fill('<$1>$$');
  await expect(
    page.getByRole('textbox', { name: 'Replace result' }),
  ).toHaveValue('a<1>$ b<22>$');
  await expect(page.getByText('2 replacements')).toBeVisible();
});

test('regex-tester Tests tab shows pass and fail per case', async ({
  page,
}) => {
  await page.goto(pathOf('regex-tester'));
  await page.getByLabel('Regex pattern').fill('^\\d+$');
  await show(page, 'Results');
  await page.getByRole('tab', { name: 'Tests' }).click();
  await page.getByRole('textbox', { name: 'Should match' }).fill('123\nabc');
  await page.getByRole('textbox', { name: 'Should not match' }).fill('xyz');
  await expect(page.getByText('2 of 3 passing')).toBeVisible();
  const results = page.getByRole('list', { name: 'Test results' });
  await expect(results.getByText('Pass', { exact: true })).toHaveCount(2);
  await expect(results.getByText('Fail', { exact: true })).toHaveCount(1);
});

test('regex-tester warns that Go cannot run a lookbehind', async ({ page }) => {
  await page.goto(pathOf('regex-tester'));
  await page.getByLabel('Regex pattern').fill('(?<=\\$)\\d+');
  await page
    .getByRole('combobox', { name: 'Code language' })
    .selectOption('go');
  await expect(
    page.getByText(/RE2 does not support lookarounds or backreferences/),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Code snippet' })).toHaveValue(
    /regexp\.MustCompile/,
  );
});

test('regex-tester share link restores pattern and text', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(pathOf('regex-tester'));
  await page.getByRole('textbox', { name: 'Test string' }).fill('id=42, id=7');
  await page.getByLabel('Regex pattern').fill('id=(?<n>\\d+)');
  await show(page, 'Results');
  await expect(page.getByText('2 matches').first()).toBeVisible();
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByText('Share link copied')).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#s=');

  const other = await context.newPage();
  await other.goto(url);
  await expect(
    other.getByRole('textbox', { name: 'Regex pattern' }),
  ).toHaveValue('id=(?<n>\\d+)');
  await show(other, 'Test text');
  await expect(other.getByRole('textbox', { name: 'Test string' })).toHaveValue(
    'id=42, id=7',
  );
  await show(other, 'Results');
  await expect(other.getByText('2 matches').first()).toBeVisible();
});

test('regex-tester explains a capture group and highlights it', async ({
  page,
}) => {
  await page.goto(pathOf('regex-tester'));
  await page.getByRole('textbox', { name: 'Test string' }).fill('a1 b22');
  await page.getByLabel('Regex pattern').fill('(\\d+)');
  const tree = page.getByRole('tree', { name: 'Pattern explanation' });
  const row = tree.getByText('Capture group 1', { exact: false }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(tree.getByRole('treeitem', { selected: true })).toContainText(
    'Capture group 1',
  );
  await show(page, 'Results');
  await expect(page.getByText('Showing group 1')).toBeVisible();
});
