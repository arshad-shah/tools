import { expect, test, type Page } from '@playwright/test';
import { makeFlatFormWord } from '../fixtures/flat-form';
import {
  expectAxeClean,
  setTheme,
  stabilise,
  VIEWPORTS,
  workspaceQuiet,
} from './helpers';

/*
 * Fill & Sign (plan C-14): detected fields on page 1 of the Word-like flat
 * form, the inline editor, My details and the signature panel, in both
 * themes, plus the phone layout. Only page 1 is shot: page 4 carries
 * checkbox glyphs that simulate third-party forms (spec §8.7, R24).
 */
const flatForm = async () => ({
  name: 'flat-form-word.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from((await makeFlatFormWord()).bytes),
});
const fieldsOnPage1 = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] [data-testid^="field-"]');

async function openForm(page: Page, theme: 'light' | 'dark') {
  await page.goto('/pdf/edit/fill-sign');
  await setTheme(page, theme);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(await flatForm());
  await expect
    .poll(() => fieldsOnPage1(page).count(), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(10);
  await workspaceQuiet(page);
  await stabilise(page);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`fill and sign ${theme}`, () => {
    test('fields', async ({ page }) => {
      await openForm(page, theme);
      await expect(page).toHaveScreenshot(`fill-sign-fields-${theme}.png`);
      await expectAxeClean(page);
    });

    test('inline editor', async ({ page }) => {
      await openForm(page, theme);
      await page
        .getByRole('button', { name: 'Text field: Surname, empty' })
        .first()
        .click();
      await page.getByRole('textbox', { name: 'Surname' }).fill('Doe');
      await workspaceQuiet(page);
      await expect(page).toHaveScreenshot(`fill-sign-editor-${theme}.png`);
    });

    test('my details', async ({ page }) => {
      await openForm(page, theme);
      await page
        .getByRole('toolbar', { name: /Fill & Sign/ })
        .getByRole('button', { name: 'My details' })
        .click();
      const dialog = page.getByRole('dialog', { name: 'My details' });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveScreenshot(
        `fill-sign-my-details-${theme}.png`,
      );
      await expectAxeClean(page);
    });

    test('signature', async ({ page }) => {
      await openForm(page, theme);
      await page
        .getByRole('toolbar', { name: /Fill & Sign/ })
        .getByRole('button', { name: 'Signature', exact: true })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Signature' });
      await dialog.getByRole('tab', { name: 'Type' }).click();
      await dialog.getByLabel('Your name').fill('Jane Doe');
      await expect(dialog).toHaveScreenshot(`fill-sign-signature-${theme}.png`);
      await expectAxeClean(page);
    });

    test('text settings', async ({ page }) => {
      await openForm(page, theme);
      await page
        .getByRole('button', { name: 'Text field: Surname, empty' })
        .first()
        .click();
      const input = page.getByRole('textbox', { name: 'Surname' });
      await input.press('Alt+t');
      const bar = page.getByRole('toolbar', { name: 'Text settings' });
      await bar.getByRole('button', { name: 'Character boxes' }).click();
      await input.click();
      await input.fill('DOE');
      await workspaceQuiet(page);
      await expect(page).toHaveScreenshot(
        `fill-sign-text-settings-${theme}.png`,
      );
      await expectAxeClean(page);
    });

    test('text bar', async ({ page }) => {
      await openForm(page, theme);
      await page
        .getByRole('button', { name: 'Text field: Surname, empty' })
        .first()
        .click();
      await page.getByRole('textbox', { name: 'Surname' }).fill('Doe');
      await expect(
        page.getByRole('toolbar', { name: 'Text settings' }),
      ).toBeVisible();
      await workspaceQuiet(page);
      await expect(page).toHaveScreenshot(`fill-sign-text-bar-${theme}.png`);
      await expectAxeClean(page);
    });

    test('text bar phone', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await openForm(page, theme);
      await page
        .getByRole('button', { name: 'Text field: Surname, empty' })
        .first()
        .click();
      await page.getByRole('textbox', { name: 'Surname' }).fill('Doe');
      const bar = page.getByRole('toolbar', { name: 'Text settings' });
      await expect(bar).toBeVisible();
      await workspaceQuiet(page);
      await expect(page).toHaveScreenshot(
        `fill-sign-text-bar-phone-${theme}.png`,
      );
      await bar.getByRole('button', { name: 'More text settings' }).click();
      const sheet = page.getByRole('dialog', { name: 'Text settings' });
      await expect(sheet).toBeVisible();
      await expect(page).toHaveScreenshot(
        `fill-sign-text-sheet-phone-${theme}.png`,
      );
      await expectAxeClean(page);
    });

    test('phone', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await openForm(page, theme);
      await expect(page).toHaveScreenshot(`fill-sign-phone-${theme}.png`);
      await expectAxeClean(page);
    });
  });
}
