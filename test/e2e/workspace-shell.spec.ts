import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { openInWorkspace, rendered } from './workspace-helpers';

/*
 * The workspace shell (P5-G): the Home handoff, navigation that scrolls the
 * document, and the default zoom.
 */
const GEN = 'test/fixtures/generated';

test('a PDF chosen on Home opens straight in the workspace', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(`${GEN}/text-3.pdf`);
  await expect(page).toHaveURL(/\/pdf\/edit/);
  await expect(rendered(page)).toBeAttached();
  await expect(page.getByText('Open a PDF')).toHaveCount(0);
});

test('clicking page 7 in the rail scrolls the document to it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openInWorkspace(page, `${GEN}/text-12.pdf`);
  const rail = page.getByRole('listbox', { name: 'Pages' });
  await rail.getByRole('option', { name: /^Page 7\b/ }).click();
  const doc = page.getByRole('region', { name: 'Document' });
  const slot = page.locator('[data-testid="page-slot-7"]');
  await expect(slot).toBeInViewport({ ratio: 0.3 });
  const view = (await doc.boundingBox())!;
  const box = (await slot.boundingBox())!;
  expect(box.y).toBeLessThan(view.y + view.height);
  expect(box.y + box.height).toBeGreaterThan(view.y);
});

/** An AcroForm with one text field on page 1 and one on page 6 of 6. */
async function twoPageForm(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const pages = Array.from({ length: 6 }, () => doc.addPage([612, 792]));
  const form = doc.getForm();
  form
    .createTextField('first')
    .addToPage(pages[0], { x: 72, y: 700, width: 240, height: 24 });
  form
    .createTextField('last')
    .addToPage(pages[5], { x: 72, y: 300, width: 240, height: 24 });
  return Buffer.from(await doc.save());
}

test('Tab to the next empty field on another page scrolls there', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pdf/edit/fill-sign');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'two-page-form.pdf',
      mimeType: 'application/pdf',
      buffer: await twoPageForm(),
    });
  await page.getByRole('button', { name: 'Text field: first, empty' }).click();
  const first = page
    .getByTestId('field-widget:first:0')
    .getByRole('textbox', { name: 'first' });
  await first.fill('Ada');
  await first.press('Tab');
  const last = page
    .getByTestId('field-widget:last:0')
    .getByRole('textbox', { name: 'last' });
  await expect(last).toBeFocused();
  await expect(last).toBeInViewport();
  await expect(page.locator('[data-testid="page-slot-6"]')).toBeInViewport();
});

test('Page size and Split open by their tools, as sheets on phones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openInWorkspace(page, `${GEN}/text-3.pdf`);
  const bar = page.getByRole('toolbar', { name: /Organize tools/ });
  const tool = bar.getByRole('button', { name: 'Page size' });
  await tool.click();
  const panel = page.getByRole('dialog', { name: 'Page size' });
  await expect(panel).toBeVisible();
  const t = (await tool.boundingBox())!;
  const p = (await panel.boundingBox())!;
  // Just below the tool, not centred on the screen.
  expect(p.y).toBeGreaterThanOrEqual(t.y + t.height);
  expect(p.y).toBeLessThan(t.y + t.height + 24);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 800 });
  await bar.getByRole('button', { name: 'Split' }).click();
  const sheet = page.getByRole('dialog', { name: 'Split into files' });
  await expect(sheet).toHaveAttribute('data-presentation', 'sheet');
  const s = (await sheet.boundingBox())!;
  expect(Math.round(s.y + s.height)).toBe(800);
  expect(Math.round(s.width)).toBe(390);
});
