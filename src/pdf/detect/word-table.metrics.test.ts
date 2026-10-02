import { describe, expect, it } from 'vitest';
import {
  loadPageInputs,
  PDFJS_OPS,
  type TruthField,
} from '../../../test/fixtures/flat-form';
import { makeWordTableForm } from '../../../test/fixtures/word-table-form';
import type { Box } from '@/pdf/doc/types';
import {
  detectPage,
  extractGeometry,
  isFlatForm,
  type DetectedField,
} from './index';

/*
 * The owner's real case (EUTR5-like): a Word table form with thin filled-
 * rectangle borders, label cells beside or above empty answer cells, Yes/No
 * square cells and a Signature/Date declaration.
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

function match(found: DetectedField[], truth: TruthField[]) {
  const pairs: { t: TruthField; f: DetectedField }[] = [];
  const used = new Set<DetectedField>();
  for (const t of truth) {
    const f = found.find(
      (x) =>
        !used.has(x) && x.pageIndex === t.page && iou(x.rect, t.rect) >= 0.6,
    );
    if (f) {
      used.add(f);
      pairs.push({ t, f });
    }
  }
  return pairs;
}

describe('Word table form (EUTR5-like)', () => {
  it('finds every answer cell, Yes/No square and declaration cell as fields', async () => {
    const { bytes, truth } = await makeWordTableForm();
    const pages = await detectAll(bytes);
    const found = pages.flatMap((p) =>
      p.fields.filter((f) => f.status === 'field'),
    );
    const pairs = match(found, truth);
    const missed = truth.filter((t) => !pairs.some((p) => p.t === t));
    expect(missed.map((t) => `${t.page}:${t.label}`)).toEqual([]);
    expect(pairs.length / found.length).toBeGreaterThanOrEqual(0.9);
    for (const { t, f } of pairs) {
      expect(f.type, `${t.page}:${t.label}`).toBe(t.type);
      expect(f.label ?? '', `${t.page}:${t.label}`).toBe(t.label);
    }
    expect(isFlatForm(pages, false)).toBe(true);
  });

  it('stays fast on a 37-page form', async () => {
    const { bytes } = await makeWordTableForm(37);
    const pages = await detectAll(bytes);
    const ms = pages.map((p) => p.ms).sort((a, b) => a - b);
    expect(pages).toHaveLength(37);
    expect(ms[Math.floor(ms.length / 2)]).toBeLessThanOrEqual(40);
  });
});
