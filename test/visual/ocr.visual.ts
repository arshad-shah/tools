import { expect, test, type Page } from '@playwright/test';
import { makeScanForm } from '../fixtures/flat-form';
import { expectAxeClean, setTheme, stabilise, workspaceQuiet } from './helpers';

/*
 * Plan F-8 step 3: OCR consent card, download progress and the report, in
 * both themes. The language download is held so the progress overlay can be
 * captured; its figures are masked.
 */
// Built in memory: the visual job does not run the fixture generator.
const SCAN = async () => ({
  name: 'scan-form.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from(await makeScanForm()),
});
const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');

async function openOcr(page: Page, theme: 'light' | 'dark') {
  await page.goto('/pdf/edit/ocr');
  await setTheme(page, theme);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(await SCAN());
  await expect(rendered(page)).toBeAttached();
  await expect(
    page.getByRole('heading', { name: 'Make this document searchable' }),
  ).toBeVisible();
  await expect(page.getByText(/MB download/)).toBeVisible();
  await workspaceQuiet(page);
  await stabilise(page);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`ocr ${theme}`, () => {
    test('consent card', async ({ page }) => {
      await openOcr(page, theme);
      await expect(page).toHaveScreenshot(`ocr-consent-${theme}.png`);
      await expectAxeClean(page);
    });

    test('download progress and report', async ({ page }) => {
      test.setTimeout(180_000);
      let release: () => void = () => {};
      const held = new Promise<void>((r) => (release = r));
      await page.route(/\.traineddata\.gz$/, async (route) => {
        await held;
        await route.continue();
      });
      await openOcr(page, theme);
      await page.getByRole('button', { name: 'Download and run' }).click();
      const overlay = page.getByRole('dialog', { name: 'Running OCR' });
      await expect(overlay).toContainText('Downloading OCR data');
      await expect(page).toHaveScreenshot(`ocr-progress-${theme}.png`, {
        mask: [overlay.getByRole('progressbar')],
      });
      release();
      await expect(page.getByLabel('OCR report')).toContainText(
        'Text layer added to 1 page',
        { timeout: 150_000 },
      );
      await expect(
        page.getByRole('listbox', { name: 'Pages' }).getByText('Text added'),
      ).toBeVisible();
      await stabilise(page);
      await expect(page).toHaveScreenshot(`ocr-report-${theme}.png`);
      await expectAxeClean(page);
    });
  });
}
