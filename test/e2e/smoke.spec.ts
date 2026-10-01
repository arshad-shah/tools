import { expect, test } from '@playwright/test';

test('dashboard lists tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tools');
  await expect(page.getByText('PDF Merger')).toBeVisible();
});

test('footer shows on dashboard and tool pages with per-tool issue link', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('footer')).toBeVisible();
  await page.goto('/pdf-merger');
  const footer = page.locator('footer');
  await expect(footer).toBeVisible();
  await expect(
    footer.getByRole('link', { name: /report an issue/i }),
  ).toHaveAttribute('href', /%5Bpdf-merger%5D/);
});

test('footer causes no horizontal scroll at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page.locator('footer')).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(375);
});
