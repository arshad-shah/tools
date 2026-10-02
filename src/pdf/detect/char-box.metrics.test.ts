import { describe, expect, it } from 'vitest';
import { loadPageInputs, PDFJS_OPS } from '../../../test/fixtures/flat-form';
import {
  makeCharBoxForm,
  type CharBoxTruth,
} from '../../../test/fixtures/char-box-form';
import type { Box } from '@/pdf/doc/types';
import { detectPage, extractGeometry, type DetectedField } from './index';

/*
 * The owner's EUTR5 page 7: one box per character. Detection reported 282
 * fields on that page; each run of boxes is one comb field.
 */
const iou = (a: Box, b: Box) => {
  const x = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const y = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
  const i = x * y;
  return i / (a.width * a.height + b.width * b.height - i);
};

async function detectAll(bytes: Uint8Array) {
  const pages = await loadPageInputs(bytes);
  return pages.map((p, i) =>
    detectPage(extractGeometry(p.list, PDFJS_OPS, p.text, p.fontNames), i),
  );
}

const find = (found: DetectedField[], t: CharBoxTruth) =>
  found.find((f) => f.pageIndex === t.page && iou(f.rect, t.rect) >= 0.8);

describe('character-box form (EUTR5 page 7)', () => {
  it('groups each run of boxes into one comb field', async () => {
    const { bytes, truth } = await makeCharBoxForm();
    const pages = await detectAll(bytes);
    const page = pages[1].fields;
    expect(page.length).toBeGreaterThanOrEqual(15);
    expect(page.length).toBeLessThanOrEqual(30);
    const combs = page.filter((f) => f.cellCount);
    expect(combs.map((f) => f.cellCount)).toEqual([
      24, 24, 24, 24, 24, 24, 8, 10, 5, 6, 24,
    ]);
    for (const t of truth) {
      const f = find(pages[t.page].fields, t);
      expect(f, `${t.page}:${t.label}`).toBeDefined();
      expect(f!.type, `${t.page}:${t.label}`).toBe(t.type);
      expect(f!.cellCount, `${t.page}:${t.label}`).toBe(t.cellCount);
      if (t.label) {
        expect(f!.label, `${t.page}:${t.label}`).toBe(t.label);
        expect(f!.status, `${t.page}:${t.label}`).toBe('field');
      }
    }
  });

  it('turns dd/mm/yyyy box groups into one date field in comb layout', async () => {
    const { bytes } = await makeCharBoxForm();
    const [, page] = await detectAll(bytes);
    const dob = page.fields.find((f) => f.label === 'Date of birth')!;
    expect(dob.type).toBe('date');
    expect(dob.cellCount).toBe(10);
  });

  it('ignores boxes with printed text, shaded bands and header rectangles', async () => {
    const { bytes, truth } = await makeCharBoxForm();
    const pages = await detectAll(bytes);
    // Page 1: only the table's three answers and the Yes/No squares.
    expect(pages[0].fields).toHaveLength(
      truth.filter((t) => t.page === 0).length,
    );
    expect(pages[0].fields.every((f) => f.rect.y < 715)).toBe(true);
    expect(pages[1].fields.some((f) => f.label === 'Office code')).toBe(false);
    expect(pages[1].fields).toHaveLength(
      truth.filter((t) => t.page === 1).length,
    );
  });

  it(
    'stays fast on a 37-page form',
    async () => {
      const { bytes } = await makeCharBoxForm(37);
      const pages = await detectAll(bytes);
      const ms = pages.map((p) => p.ms).sort((a, b) => a - b);
      expect(pages).toHaveLength(37);
      // Shared CI runners are several times slower than a dev machine.
      const budget = process.env.CI ? 200 : 40;
      expect(ms[Math.floor(ms.length / 2)]).toBeLessThanOrEqual(budget);
    },
    process.env.CI ? 60_000 : 20_000,
  );
});
