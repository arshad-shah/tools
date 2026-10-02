import { expect, test, type Page } from '@playwright/test';
import { makeTextPdf } from '../fixtures/builders';
import { expectAxeClean, setTheme, stabilise, VIEWPORTS } from './helpers';

/*
 * The spec §15 matrix for the workspace (plan G-5): every mode in Standard
 * and Focus on desktop and on a phone, in both themes, with a fixture open;
 * plus the forced-colours focus outlines (plan G-3, light only).
 */
const MODES = [
  'organize',
  'edit',
  'annotate',
  'fill-sign',
  'redact',
  'convert',
  'protect',
  'optimize',
  'ocr',
] as const;

const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');

async function openMode(page: Page, mode: string, theme: 'light' | 'dark') {
  await page.goto(`/pdf/edit/${mode}`);
  await setTheme(page, theme);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'text-3.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await makeTextPdf({ pages: 3, label: 'Alpha' })),
    });
  await expect(rendered(page)).toBeAttached();
  await expect(
    page
      .getByText('Saved on this device')
      .or(page.getByRole('img', { name: 'Saved on this device' }))
      .first(),
  ).toBeVisible();
  await stabilise(page);
}

for (const theme of ['light', 'dark'] as const) {
  for (const mode of MODES) {
    test.describe(`workspace ${mode} ${theme}`, () => {
      test('standard', async ({ page }) => {
        await openMode(page, mode, theme);
        await expect(page).toHaveScreenshot(
          `mode-${mode}-standard-${theme}.png`,
        );
        await expectAxeClean(page);
      });

      test('focus', async ({ page }) => {
        await openMode(page, mode, theme);
        await page.keyboard.press('f');
        await expect(page.getByRole('toolbar').first()).toBeVisible();
        await expect(page).toHaveScreenshot(`mode-${mode}-focus-${theme}.png`);
        await expectAxeClean(page);
      });

      test('phone', async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.phone);
        await openMode(page, mode, theme);
        await expect(page).toHaveScreenshot(`mode-${mode}-phone-${theme}.png`);
        await expectAxeClean(page);
      });
    });
  }
}

test('forced colours keep the focus outline visible', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await openMode(page, 'organize', 'light');
  await page
    .getByRole('listbox', { name: 'Pages' })
    .getByRole('option')
    .first()
    .focus();
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveScreenshot('forced-colors.png');
});
