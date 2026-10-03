import { expect, test, type Page } from '@playwright/test';
import { makeAesEncryptedPdf, makeTextPdf } from '../fixtures/builders';
import {
  VIEWPORTS,
  expectAxeClean,
  setTheme,
  stabilise,
  workspaceQuiet,
} from './helpers';

/*
 * The PDF workspace (plan B-18): Standard, Focus and phone layouts in
 * Organize, the Export dialog, the empty state with recent documents and
 * the password prompt, in both themes. Relative times are masked.
 */
// Built in memory: the visual job does not run the fixture generator.
const pdf = async (name: string, bytes: Promise<Uint8Array>) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from(await bytes),
});
const TEXT_3 = () =>
  pdf('text-3.pdf', makeTextPdf({ pages: 3, label: 'Alpha' }));
const AES = () => pdf('encrypted-aes.pdf', makeAesEncryptedPdf());
const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');

async function openDoc(page: Page, theme: 'light' | 'dark') {
  await page.goto('/pdf/edit');
  await setTheme(page, theme);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(await TEXT_3());
  await expect(rendered(page)).toBeAttached();
  // Thumbnails and the saved state settle before the shot.
  // Text from lg up; a labelled status dot on compact layouts.
  await workspaceQuiet(page);
  await stabilise(page);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`workspace ${theme}`, () => {
    test('standard', async ({ page }) => {
      await openDoc(page, theme);
      await expect(page).toHaveScreenshot(`workspace-standard-${theme}.png`);
      await expectAxeClean(page);
    });

    test('focus', async ({ page }) => {
      await openDoc(page, theme);
      await page.keyboard.press('f');
      await expect(
        page.getByRole('toolbar', { name: 'Organize tools' }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot(`workspace-focus-${theme}.png`);
      await expectAxeClean(page);
    });

    test('phone', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await openDoc(page, theme);
      await expect(page).toHaveScreenshot(`workspace-phone-${theme}.png`);
      await expectAxeClean(page);
    });

    test('export dialog', async ({ page }) => {
      await openDoc(page, theme);
      await page.keyboard.press('r');
      await page
        .getByRole('button', { name: /^Export/ })
        .first()
        .click();
      const dialog = page.getByRole('dialog', { name: 'Export PDF' });
      await expect(
        dialog.getByText('As exported', { exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByRole('img', { name: 'Page 1 as exported' }),
      ).toHaveAttribute('data-rendered', 'true');
      await expect(page).toHaveScreenshot(`workspace-export-${theme}.png`);
      await expectAxeClean(page);
    });

    test('empty state with recent documents', async ({ page }) => {
      await openDoc(page, theme);
      await page.goto('/pdf/edit');
      await expect(
        page.getByRole('heading', { name: 'Recent documents' }),
      ).toBeVisible();
      await stabilise(page);
      await expect(page).toHaveScreenshot(`workspace-empty-${theme}.png`);
      await expectAxeClean(page);
    });

    test('password prompt', async ({ page }) => {
      await page.goto('/pdf/edit');
      await setTheme(page, theme);
      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles(await AES());
      await expect(
        page.getByLabel('Password for encrypted-aes.pdf', { exact: true }),
      ).toBeVisible();
      await stabilise(page);
      await expect(page).toHaveScreenshot(`workspace-password-${theme}.png`);
      await expectAxeClean(page);
    });
  });
}
