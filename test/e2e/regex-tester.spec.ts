import { expect, test } from '@playwright/test';
import { pathOf } from './tool-routes';

test('regex-tester survives catastrophic backtracking', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto(pathOf('regex-tester'));
  await page.getByLabel('Test string').fill('a'.repeat(40) + 'b');
  await page.getByLabel('Regex pattern').fill('(a+)+$');

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
  await page.getByLabel('Test string').fill("it's a/b\nand a/b");
  await page.getByLabel('Regex pattern').fill('a/b');
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
  await page.getByLabel('Test string').fill('abc');
  await page.getByLabel('Regex pattern').fill('(');
  await expect(page.getByText('Invalid', { exact: true })).toBeVisible();
  await expect(page.getByText(/Unterminated group/)).toBeVisible();
});
