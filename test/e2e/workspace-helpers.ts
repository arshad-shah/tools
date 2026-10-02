import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Shared by the Annotate, Edit and fidelity specs (P5-D). */
export const rendered = (page: Page, n = 1) =>
  page
    .locator(`[data-testid="page-slot-${n}"] canvas[data-rendered="true"]`)
    .first();

export async function openInWorkspace(page: Page, file: string, mode?: RegExp) {
  await page.goto('/pdf/edit');
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(rendered(page)).toBeAttached();
  if (mode) {
    await page.getByRole('tab', { name: mode }).click();
    await expect(page.getByRole('tab', { name: mode })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  }
}

export async function exportPdf(page: Page) {
  await page
    .getByRole('button', { name: /^Export/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Export PDF' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  return new Uint8Array(readFileSync((await download.path())!));
}

/** Page box of the slot, for pointer gestures in page space (scale from the slot width). */
export async function slotOf(page: Page, n = 1) {
  const box = (await page
    .locator(`[data-testid="page-slot-${n}"]`)
    .boundingBox())!;
  const scale = box.width / 612;
  /** Screen point of a page-space point on a 612 x 792 upright page. */
  const at = (x: number, y: number) => ({
    x: box.x + x * scale,
    y: box.y + (792 - y) * scale,
  });
  return { box, scale, at };
}

export async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

// pdf.js annotation data is loosely typed; the specs read what they need.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Annot = Record<string, any>;

export async function annotationsOf(
  bytes: Uint8Array,
  pageIndex = 0,
): Promise<Annot[]> {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const pdf = await task.promise;
    return (await (
      await pdf.getPage(pageIndex + 1)
    ).getAnnotations()) as Annot[];
  } finally {
    await task.destroy();
  }
}

/** A point as mouse.click arguments. */
export const xy = (p: { x: number; y: number }): [number, number] => [p.x, p.y];
