import { expect, test } from '@playwright/test';
import { pathOf } from './tool-routes';

/*
 * Spec §5.3: a quick task's single-PDF result opens in the workspace
 * through the in-memory document store (plan E-13 step 1.5).
 */
test('a merged result opens in the workspace', async ({ page }) => {
  await page.goto(pathOf('pdf-merger'));
  await page
    .locator('input[type=file]')
    .setInputFiles([
      'test/fixtures/generated/text-3.pdf',
      'test/fixtures/generated/text-12.pdf',
    ]);
  await expect(page.getByText('text-12.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Merge PDFs' }).click();
  await page.getByRole('button', { name: 'Open result in workspace' }).click();

  await expect(page).toHaveURL(/\/pdf\/edit/);
  // The rail is virtualised: the first option already names the count.
  const rail = page.getByRole('listbox', { name: 'Pages' });
  await expect(
    rail.getByRole('option', { name: /^Page 1 of 15/ }),
  ).toBeAttached();
  await expect(
    page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]'),
  ).toBeAttached();
});
