import { expect, test } from '@playwright/test';

test('dashboard lists tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tools');
  await expect(page.getByText('PDF Merger')).toBeVisible();
});
