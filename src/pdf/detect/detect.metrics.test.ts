import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  loadPageInputs,
  makeComplexPagePdf,
  makeFlatFormStroked,
  makeFlatFormWord,
  makeMixedAcroform,
  makeNegativeReport,
  PDFJS_OPS,
  type TruthField,
} from '../../../test/fixtures/flat-form';
import type { Box } from '@/pdf/doc/types';
import {
  dedupeAgainstWidgets,
  detectPage,
  extractGeometry,
  isFlatForm,
  type DetectedField,
  type PageDetection,
} from './index';

const PRIVATE = 'test/fixtures/private';

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

async function detectAll(bytes: Uint8Array): Promise<PageDetection[]> {
  const pages = await loadPageInputs(bytes);
  return pages.map((p, i) =>
    detectPage(
      extractGeometry(p.list, PDFJS_OPS, p.text, p.fontNames, p.fonts),
      i,
    ),
  );
}
const fieldsOf = (pages: PageDetection[]) => pages.flatMap((p) => p.fields);

interface Score {
  precision: number;
  recall: number;
  labels: number;
  typeMismatches: string[];
  prechecked: string[];
  missed: TruthField[];
  extra: DetectedField[];
}

function score(found: DetectedField[], truth: TruthField[]): Score {
  const matched = new Set<number>();
  let tp = 0;
  let labelOk = 0;
  const typeMismatches: string[] = [];
  const prechecked: string[] = [];
  const extra: DetectedField[] = [];
  for (const f of found) {
    const j = truth.findIndex(
      (t, k) =>
        !matched.has(k) && t.page === f.pageIndex && iou(t.rect, f.rect) >= 0.6,
    );
    if (j < 0) {
      extra.push(f);
      continue;
    }
    matched.add(j);
    tp++;
    const t = truth[j];
    if (
      (t.label ?? '')
        .toLowerCase()
        .startsWith((f.label ?? '').toLowerCase().slice(0, 4))
    )
      labelOk++;
    if (['tick', 'date'].includes(t.type) && t.type !== f.type)
      typeMismatches.push(`${f.id} ${f.type}`);
    if (Boolean(t.prechecked) !== Boolean(f.prechecked)) prechecked.push(f.id);
  }
  return {
    precision: found.length ? tp / found.length : 0,
    recall: truth.length ? tp / truth.length : 0,
    labels: tp ? labelOk / tp : 0,
    typeMismatches,
    prechecked,
    missed: truth.filter((_, k) => !matched.has(k)),
    extra,
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

describe.each([
  ['word', makeFlatFormWord],
  ['stroked', makeFlatFormStroked],
])('%s flat form', (name, make) => {
  it('precision and recall >= 0.90 at IoU >= 0.6; labels >= 0.85; ticks and dates exact', async () => {
    const { bytes, truth } = await make();
    const pages = await detectAll(bytes);
    const found = fieldsOf(pages).filter((f) => f.status === 'field');
    const s = score(found, truth);
    console.info(
      `[metrics] ${name}: precision ${s.precision.toFixed(3)}, recall ${s.recall.toFixed(3)}, ` +
        `labels ${s.labels.toFixed(3)}, fields ${found.length}, truth ${truth.length}, ` +
        `missed ${JSON.stringify(s.missed.map((t) => `${t.page}:${t.label}`))}, ` +
        `extra ${JSON.stringify(s.extra.map((f) => f.id))}`,
    );
    expect(s.precision).toBeGreaterThanOrEqual(0.9);
    expect(s.recall).toBeGreaterThanOrEqual(0.9);
    expect(s.labels).toBeGreaterThanOrEqual(0.85);
    expect(s.typeMismatches).toEqual([]);
    expect(s.prechecked).toEqual([]);
    expect(isFlatForm(pages, false)).toBe(true);
  });

  it('median detection time <= 40 ms per page', async () => {
    const { bytes } = await make();
    const pages = await loadPageInputs(bytes);
    const ms: number[] = [];
    const withGeometry: number[] = [];
    for (let round = 0; round < 3; round++)
      pages.forEach((p, i) => {
        const start = performance.now();
        const geom = extractGeometry(
          p.list,
          PDFJS_OPS,
          p.text,
          p.fontNames,
          p.fonts,
        );
        ms.push(detectPage(geom, i).ms);
        withGeometry.push(performance.now() - start);
      });
    console.info(
      `[metrics] ${name}: median ${median(ms).toFixed(2)} ms, max ${Math.max(...ms).toFixed(2)} ms; ` +
        `with geometry extraction median ${median(withGeometry).toFixed(2)} ms`,
    );
    expect(median(ms)).toBeLessThanOrEqual(40);
    expect(median(withGeometry)).toBeLessThanOrEqual(40);
  });
});

it('negative report: <= 2 detections and not a flat form', async () => {
  const pages = await detectAll(await makeNegativeReport());
  const all = fieldsOf(pages);
  const fields = all.filter((f) => f.status === 'field');
  console.info(
    `[metrics] negative: ${fields.length} fields, ${all.length - fields.length} suggestions`,
  );
  // Suggestions count too: they are drawn on the page.
  expect(all.length).toBeLessThanOrEqual(2);
  expect(fields).toEqual([]);
  expect(isFlatForm(pages, false)).toBe(false);
});

async function widgetRects(
  bytes: Uint8Array,
): Promise<{ pageIndex: number; rect: Box }[]> {
  const doc = await PDFDocument.load(bytes);
  const pageRefs = doc.getPages().map((p) => p.ref);
  const out: { pageIndex: number; rect: Box }[] = [];
  for (const field of doc.getForm().getFields())
    for (const w of field.acroField.getWidgets()) {
      const ref = w.P();
      const pageIndex = Math.max(
        0,
        ref ? pageRefs.findIndex((r) => r === ref) : 0,
      );
      out.push({ pageIndex, rect: w.getRectangle() });
    }
  return out;
}

it('mixed AcroForm: no detection overlaps a widget (IoU >= 0.3)', async () => {
  const { bytes, truth } = await makeMixedAcroform();
  const widgets = await widgetRects(bytes);
  expect(widgets).toHaveLength(4);
  const raw = fieldsOf(await detectAll(bytes));
  // The drawn cells under the widgets are detected, then dropped in favour of the widgets.
  expect(raw.some((f) => widgets.some((w) => iou(w.rect, f.rect) >= 0.3))).toBe(
    true,
  );
  const kept = dedupeAgainstWidgets(raw, widgets);
  for (const f of kept)
    for (const w of widgets) expect(iou(w.rect, f.rect)).toBeLessThan(0.3);
  const s = score(
    kept.filter((f) => f.status === 'field'),
    truth,
  );
  expect(s.recall).toBe(1);
  expect(s.precision).toBe(1);
});

it('a page over 20 000 path ops is skipped as too complex', async () => {
  const [page] = await detectAll(await makeComplexPagePdf());
  expect(page).toMatchObject({ skipped: 'too-complex', fields: [] });
});

it.skipIf(!existsSync(PRIVATE))(
  'owner sample: flat form with fields on most pages',
  async () => {
    const files = readdirSync(PRIVATE).filter((f) =>
      f.toLowerCase().endsWith('.pdf'),
    );
    for (const file of files) {
      const pages = await detectAll(
        new Uint8Array(readFileSync(join(PRIVATE, file))),
      );
      const withFields = pages.filter((p) =>
        p.fields.some((f) => f.status === 'field'),
      );
      console.info(
        `[metrics] ${file}: ${withFields.length}/${pages.length} pages with fields`,
      );
      expect(isFlatForm(pages, false)).toBe(true);
      expect(withFields.length / pages.length).toBeGreaterThan(0.5);
    }
  },
);
