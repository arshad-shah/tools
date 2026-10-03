import { expect, test, type Page } from '@playwright/test';
import { makeImageHeavyPdf, makeTextPdf } from '../fixtures/builders';
import { makeRedactBasic, REDACT_TERM } from '../fixtures/redact';
import {
  expectAxeClean,
  setTheme,
  stabilise,
  VIEWPORTS,
  workspaceQuiet,
} from './helpers';

/*
 * Plan E-13 step 2: Redact (marks, search panel, apply confirmation,
 * report), Protect (permissions, sanitise dialog), Optimize (size
 * breakdown), the Convert panel and a quick task with a result, in both
 * themes; Redact in Focus on a phone.
 */
const pdf = async (name: string, bytes: Promise<Uint8Array>) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from(await bytes),
});
const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');

async function openIn(
  page: Page,
  mode: string,
  theme: 'light' | 'dark',
  file = pdf('redact-basic.pdf', makeRedactBasic()),
) {
  await page.goto(`/pdf/edit/${mode}`);
  await setTheme(page, theme);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(await file);
  await expect(rendered(page)).toBeAttached();
  await settle(page);
}

/** Autosave settled ("Saving" otherwise races the shot), then stabilised. */
async function settle(page: Page) {
  await workspaceQuiet(page);
  await stabilise(page);
}

async function markTerm(page: Page) {
  await page.getByRole('button', { name: 'Find and mark' }).first().click();
  await page.getByRole('textbox', { name: 'Find' }).fill(REDACT_TERM);
  await expect(
    page.getByRole('list', { name: 'Matches' }).getByRole('checkbox').first(),
  ).toBeVisible();
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`redact and protect ${theme}`, () => {
    test('redact search and marks', async ({ page }) => {
      await openIn(page, 'redact', theme);
      await markTerm(page);
      await page.getByRole('button', { name: 'Mark all' }).click();
      await expect(page.getByTestId('redact-mark').first()).toBeAttached();
      await settle(page);
      await expect(page).toHaveScreenshot(`redact-marks-${theme}.png`);
      await expectAxeClean(page);
    });

    test('redact apply confirmation and report', async ({ page }) => {
      // Apply rasterises and verifies in workers: a budget for slow runners.
      test.setTimeout(120_000);
      await openIn(page, 'redact', theme);
      await markTerm(page);
      await page.getByRole('button', { name: 'Mark all' }).click();
      await page
        .getByRole('button', { name: 'Apply redactions' })
        .first()
        .click();
      const confirm = page.getByRole('dialog', { name: 'Apply redactions' });
      await expect(confirm).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`redact-confirm-${theme}.png`);
      await confirm.getByRole('button', { name: 'Apply redactions' }).click();
      await expect(page.getByLabel('Redaction report')).toContainText(
        'verified',
        { timeout: 60_000 },
      );
      await settle(page);
      await expect(page).toHaveScreenshot(`redact-report-${theme}.png`);
      await expectAxeClean(page);
    });

    test('protect permissions and sanitise', async ({ page }) => {
      await openIn(page, 'protect', theme);
      await page
        .getByRole('button', { name: 'Password protection' })
        .first()
        .click();
      await page.getByRole('switch', { name: 'Password protection' }).click();
      await settle(page);
      await expect(page).toHaveScreenshot(`protect-permissions-${theme}.png`);
      await page.getByRole('button', { name: 'Sanitise' }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await stabilise(page);
      await expect(page).toHaveScreenshot(`protect-sanitise-${theme}.png`);
      await expectAxeClean(page);
    });

    test('convert panel', async ({ page }) => {
      await openIn(
        page,
        'convert',
        theme,
        pdf('text-3.pdf', makeTextPdf({ pages: 3, label: 'Alpha' })),
      );
      await expect(page).toHaveScreenshot(`convert-${theme}.png`);
      await expectAxeClean(page);
    });

    test('quick task with a result', async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto('/pdf/compress');
      await setTheme(page, theme);
      await page
        .locator('input[type=file]')
        // Images that recompress, so the result is smaller and offered.
        .setInputFiles(await pdf('images-heavy.pdf', makeImageHeavyPdf()));
      await page.getByRole('button', { name: 'Compress PDF' }).click();
      await expect(
        page.getByRole('button', { name: 'Open result in workspace' }),
      ).toBeVisible({ timeout: 60_000 });
      await stabilise(page);
      await expect(page).toHaveScreenshot(`quick-task-result-${theme}.png`);
      await expectAxeClean(page);
    });
  });
}

test('redact in Focus on a phone', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.phone);
  await openIn(page, 'redact', 'light');
  await page.keyboard.press('f');
  await stabilise(page);
  await expect(page).toHaveScreenshot('redact-phone-focus-light.png');
  await expectAxeClean(page);
});
