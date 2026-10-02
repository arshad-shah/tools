import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';
import { compareOverlayWithExport } from '../visual-diff/overlay-vs-export';

/*
 * Spec §17 row B exit: open, organize, undo, redo, reload, export (plan B-18).
 */
const FILE = 'test/fixtures/generated/text-3.pdf';
const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');
const rail = (page: Page) => page.getByRole('listbox', { name: 'Pages' });
const option = (page: Page, n: number, of: number) =>
  rail(page).getByRole('option', { name: new RegExp(`^Page ${n} of ${of}`) });
const announcer = (page: Page) => page.getByTestId('workspace-announcer');
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

async function open(page: Page) {
  await page.goto('/pdf/edit');
  await page.locator('input[type=file]').first().setInputFiles(FILE);
  await expect(rendered(page)).toBeAttached();
}

async function exportPdf(page: Page) {
  await page
    .getByRole('button', { name: /^Export/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Export PDF' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  return {
    name: download.suggestedFilename(),
    bytes: new Uint8Array(readFileSync((await download.path())!)),
  };
}

test('open, organize, undo, reload and export', async ({ page }) => {
  await open(page);

  // Page 3 to the front with Alt+ArrowUp twice; focus stays on it.
  await option(page, 3, 3).click();
  await option(page, 3, 3).press('Alt+ArrowUp');
  await expect(option(page, 2, 3)).toBeFocused();
  await option(page, 2, 3).press('Alt+ArrowUp');
  await expect(option(page, 1, 3)).toBeFocused();
  await expect(announcer(page)).toBeAttached();

  // R rotates the selected page (now first) clockwise.
  await page.keyboard.press('r');
  await expect(
    page.getByRole('button', { name: 'Undo Rotate page 1 clockwise' }),
  ).toBeAttached();

  // Delete the last page (the original page 2).
  await option(page, 3, 3).click();
  await option(page, 3, 3).press('Delete');
  await expect(option(page, 2, 2)).toBeAttached();

  await page.keyboard.press(`${mod}+z`);
  await expect(announcer(page)).toHaveText('Undid: delete page 3');
  await expect(option(page, 3, 3)).toBeAttached();
  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(announcer(page)).toHaveText('Redid: delete page 3');
  await expect(option(page, 2, 2)).toBeAttached();

  // Reload: the document comes back from this device as it was.
  await expect(page.getByText('Saved on this device')).toBeVisible();
  await expect(page).toHaveURL(/doc=/);
  await page.reload();
  await expect(rendered(page)).toBeAttached();
  await expect(option(page, 2, 2)).toBeAttached();
  await expect(page.getByRole('tab', { name: /Organize/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Undo Delete page 3' }),
  ).toBeAttached();

  const out = await exportPdf(page);
  expect(out.name).toBe('text-3.edited.pdf');
  const doc = await PDFDocument.load(out.bytes);
  expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 0]);
  expect(await pdfPageTexts(out.bytes)).toEqual(['Alpha 3', 'Alpha 1']);
});

test('an unchanged page looks the same exported', async ({ page }) => {
  await open(page);
  const out = await exportPdf(page);
  const ratio = await compareOverlayWithExport(page, {
    pageNumber: 1,
    exportBytes: out.bytes,
    scale: 1,
  });
  expect(ratio).toBeLessThanOrEqual(0.015);
});

test('zooming past 200 percent renders sharp tiles for the visible area', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('region', { name: 'Document' }).click();
  // The default reads at 125% at most (P5-G): 150, 200, then 300.
  for (let i = 0; i < 3; i++) await page.keyboard.press(`${mod}+Equal`);
  const tiles = page.locator(
    '[data-testid="page-slot-1"] canvas[aria-label="Page 1 detail"][data-rendered="true"]',
  );
  await expect(tiles.first()).toBeAttached();
  // Visible area only: far fewer tiles than the whole page would need.
  expect(await tiles.count()).toBeLessThan(40);
});
