import { expect, test } from '@playwright/test';

test('regex-tester survives catastrophic backtracking', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/regex-tester');
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

test('regex-tester shows syntax errors without running the pattern', async ({
  page,
}) => {
  await page.goto('/regex-tester');
  await page.getByLabel('Test string').fill('abc');
  await page.getByLabel('Regex pattern').fill('(');
  await expect(page.getByText('Invalid', { exact: true })).toBeVisible();
  await expect(page.getByText(/Unterminated group/)).toBeVisible();
});
