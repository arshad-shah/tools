import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  loadPageInputs,
  makeComplexPagePdf,
  makeRawContentPdf,
  PDFJS_OPS,
} from '../../../test/fixtures/flat-form';
import { extractGeometry, MAX_PATH_OPS } from './geometry';
import type { PageGeometry } from './types';

async function geometryOf(bytes: Uint8Array): Promise<PageGeometry> {
  const [p] = await loadPageInputs(bytes);
  return extractGeometry(p.list, PDFJS_OPS, p.text, p.fontNames);
}
const raw = async (content: string, resources?: Record<string, unknown>) =>
  geometryOf(await makeRawContentPdf(content, resources));

describe('extractGeometry', () => {
  it('collects a stroked line as one segment', async () => {
    const g = await raw('0 0 m 100 0 l S');
    expect(g.segments).toEqual([{ x1: 0, y1: 0, x2: 100, y2: 0 }]);
    expect(g.skipped).toBeNull();
  });

  it('applies the CTM stack', async () => {
    const g = await raw('q 2 0 0 2 10 10 cm 0 0 m 50 0 l S Q 0 0 m 5 0 l S');
    expect(g.segments).toEqual([
      { x1: 10, y1: 10, x2: 110, y2: 10 },
      { x1: 0, y1: 0, x2: 5, y2: 0 },
    ]);
  });

  it('keeps a thin filled rectangle as a rect', async () => {
    const g = await raw('10 10 100 0.5 re f');
    expect(g.rects).toHaveLength(1);
    expect(g.rects[0]).toMatchObject({
      x: 10,
      w: 100,
      filled: true,
      stroked: false,
    });
    expect(g.rects[0].y).toBeCloseTo(10);
    expect(g.rects[0].h).toBeCloseTo(0.5);
    expect(g.segments).toEqual([]);
  });

  it('keeps a stroked rectangle', async () => {
    const g = await raw('10 10 50 30 re S');
    expect(g.rects).toEqual([
      {
        x: 10,
        y: 10,
        w: 50,
        h: 30,
        filled: false,
        stroked: true,
        fill: null,
        alpha: 1,
      },
    ]);
  });

  it('records the fill colour', async () => {
    const g = await raw('1 g 0 0 100 1 re f');
    expect(g.rects[0].fill).toBe('#ffffff');
  });

  it('records the fill alpha from an ExtGState', async () => {
    const g = await raw('/GS1 gs 0 0 100 1 re f', {
      ExtGState: { GS1: { Type: 'ExtGState', ca: 0.05 } },
    });
    expect(g.rects[0].alpha).toBeCloseTo(0.05);
  });

  it('drops nearly invisible strokes', async () => {
    const g = await raw('/GS1 gs 0 0 m 100 0 l S', {
      ExtGState: { GS1: { Type: 'ExtGState', CA: 0.05 } },
    });
    expect(g.segments).toEqual([]);
  });

  it('ignores clip-only paths and curves', async () => {
    const g = await raw('0 0 100 100 re W n 0 0 m 10 10 20 10 30 0 c S');
    expect(g.segments).toEqual([]);
    expect(g.rects).toEqual([]);
  });

  it('splits a text run into per-glyph boxes', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Name:', { x: 72, y: 700, size: 12, font });
    const g = await geometryOf(await doc.save());
    expect(g.runs).toHaveLength(1);
    const run = g.runs[0];
    expect(run).toMatchObject({ str: 'Name:', x: 72, baseline: 700, size: 12 });
    expect(run.font).toMatch(/helvetica/i);
    expect(run.w).toBeCloseTo(font.widthOfTextAtSize('Name:', 12), 3);
    expect(run.y).toBeLessThan(700);
    expect(run.y + run.h).toBeGreaterThan(700 + 8);
    expect(g.glyphs.map((b) => b.ch)).toEqual(['N', 'a', 'm', 'e', ':']);
    expect(g.glyphs.map((b) => b.cp)).toEqual([78, 97, 109, 101, 58]);
    for (let i = 1; i < g.glyphs.length; i++)
      expect(g.glyphs[i].x).toBeGreaterThan(g.glyphs[i - 1].x);
    const last = g.glyphs[g.glyphs.length - 1];
    expect(g.glyphs[0].x).toBeCloseTo(run.x);
    expect(last.x + last.w).toBeCloseTo(run.x + run.w);
    for (const b of g.glyphs) {
      expect(b.y).toBeCloseTo(run.y);
      expect(b.h).toBeCloseTo(run.h);
      expect(b.baseline).toBe(700);
    }
  });

  it('skips pages above the path-op budget', async () => {
    const g = await geometryOf(await makeComplexPagePdf(MAX_PATH_OPS + 1));
    expect(g.skipped).toBe('too-complex');
    expect(g.opCount).toBeGreaterThan(MAX_PATH_OPS);
    expect(g.segments).toEqual([]);
    expect(g.rects).toEqual([]);
  });

  it('ignores annotation appearance streams', () => {
    const O = PDFJS_OPS;
    const path = [O.stroke, [Float32Array.from([0, 0, 0, 1, 100, 0])], null];
    const g = extractGeometry(
      {
        fnArray: [O.beginAnnotation!, O.constructPath, O.endAnnotation!],
        argsArray: [null, path, null],
      },
      O,
      { items: [], styles: {} },
      {},
    );
    expect(g.segments).toEqual([]);
  });
});
