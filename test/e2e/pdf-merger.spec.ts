import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('merges two PDFs honouring order and page selection', async ({ page }) => {
  await page.goto('/pdf-merger');
  await page
    .locator('input[type=file]')
    .setInputFiles([
      'test/fixtures/generated/text-3.pdf',
      'test/fixtures/generated/text-12.pdf',
    ]);
  await expect(page.getByText('text-12.pdf')).toBeVisible();

  // Every row shows a rendered thumbnail.
  const rows = page.locator('li[data-sortable-item]');
  await expect(rows).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const img = rows.nth(i).getByRole('img');
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((c) => (c as HTMLCanvasElement).width))
      .toBeGreaterThan(0);
  }
  await expect(rows.nth(1)).toContainText('12 pages');

  // Hovering the first thumbnail shows a larger preview inside the viewport.
  await rows.first().getByRole('img').hover();
  const popover = page.getByLabel('Preview of text-3.pdf', { exact: true });
  await expect(popover).toBeVisible();
  await expect
    .poll(async () => {
      const box = await popover.boundingBox();
      const vp = page.viewportSize()!;
      return (
        !!box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= vp.width &&
        box.y + box.height <= vp.height
      );
    })
    .toBe(true);
  await page.mouse.move(0, 0);

  // Move text-12 above text-3 with the keyboard (Alt+ArrowUp on the row).
  const second = page.locator('li[data-sortable-item]', {
    hasText: 'text-12.pdf',
  });
  await second.focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(rows.first()).toContainText('text-12.pdf');
  await expect(
    page.locator('li[data-sortable-item]', { hasText: 'text-12.pdf' }),
  ).toBeFocused();

  await page.getByLabel('Pages from text-12.pdf').fill('1-2');
  await page.getByRole('button', { name: 'Merge PDFs' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-12.merged.pdf');
  const doc = await PDFDocument.load(readFileSync((await download.path())!));
  expect(doc.getPageCount()).toBe(2 + 3);
});

test('rejects an invalid file by name', async ({ page }) => {
  await page.goto('/pdf-merger');
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 not really a pdf'),
  });
  await expect(page.getByRole('alert')).toContainText('broken.pdf');
});
