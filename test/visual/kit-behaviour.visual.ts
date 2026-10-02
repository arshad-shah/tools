import { expect, test } from '@playwright/test';

/*
 * Behaviour that jsdom cannot see (layout, visibility, real event order),
 * checked in Chromium against the dev-only kit gallery.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/__kit');
  await expect(
    page.getByRole('heading', { name: 'Kit gallery' }),
  ).toBeVisible();
});

test('Popover takes focus on its first open; Esc returns it to the anchor', async ({
  page,
}) => {
  const anchor = page.getByRole('button', { name: 'Add note' });
  await anchor.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Note' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(anchor).toBeFocused();
  // And again on the second open.
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeFocused();
});
