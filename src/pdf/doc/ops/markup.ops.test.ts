import { beforeAll, describe, expect, it } from 'vitest';
import { degrees, PDFDocument, StandardFonts } from 'pdf-lib';
import { makeTextPdf, textPositions } from '../../../../test/fixtures/builders';
import { pageViewport, toScreen } from '../geometry';
import { headerFooterDoc } from '@/pdf/edit/markup';
import { pageFrame } from '@/pdf/edit/geometry';
import {
  formatHeaderFooter,
  headerFooterPlacements,
} from '@/pdf/edit/markup-layout';
import { ALL_MATERIALIZERS } from '../materialize';
import { materialize } from '../materialize/materialize';
import { registerMaterializers } from '../materialize/registry';
import { summarizeChanges } from '../summary';
import { makeModel } from '../test-helpers';
import type { OverlayItem } from '../types';
import { registerCoreOperations } from '.';

registerCoreOperations();
registerMaterializers(ALL_MATERIALIZERS);

const hf = (patch: Record<string, unknown> = {}) => ({
  type: 'markup.headerFooter',
  params: {
    id: 'hf',
    header: { left: '', center: '{filename}', right: '' },
    footer: { left: '', center: 'Page {n} of {total}', right: '' },
    fontSize: 10,
    color: '#333333',
    margin: { top: 24, bottom: 24, side: 36 },
    pages: { mode: 'all' },
    filename: 'report.pdf',
    date: Date.UTC(2026, 9, 2),
    ...patch,
  },
});
const wm = (text: string) => ({
  type: 'markup.watermark',
  params: {
    id: `wm-${text}`,
    content: { kind: 'text', text, fontSize: 60, color: '#ff0000' },
    opacity: 0.3,
    rotation: 45,
    position: 'center',
    margin: 36,
    pages: { mode: 'all' },
  },
});

describe('formatHeaderFooter', () => {
  const ctx = {
    n: 2,
    total: 5,
    date: new Date(2026, 9, 2),
    filename: 'a.pdf',
    locale: 'en-GB',
  };
  it('fills the tokens', () => {
    expect(formatHeaderFooter('Page {n} of {total}', ctx)).toBe('Page 2 of 5');
    expect(formatHeaderFooter('{filename}', ctx)).toBe('a.pdf');
    expect(formatHeaderFooter('{date}', ctx)).toBe('2 Oct 2026');
  });
  it('leaves unknown tokens as typed', () => {
    expect(formatHeaderFooter('{x} {n}', ctx)).toBe('{x} 2');
  });
});

describe('markup ops', () => {
  it('labels; a new op of a type replaces the earlier one', () => {
    const model = makeModel();
    expect(model.dispatch(wm('DRAFT'))[0].label).toBe('Add watermark');
    model.dispatch(wm('FINAL'));
    model.dispatch(hf());
    model.dispatch({
      type: 'markup.pageNumbers',
      params: {
        id: 'pn',
        format: 'n-of-total',
        position: 'bottom-center',
        startAt: 1,
        pages: { mode: 'all' },
        fontSize: 10,
        margin: 24,
      },
    });
    const view = model.getView();
    expect(
      view.docOverlays.filter((o) => !view.hidden.has(o.opId)),
    ).toHaveLength(3);
    expect(summarizeChanges(model.getState(), view)[0].lines).toEqual([
      'Watermark',
      'Header and footer',
      'Page numbers',
    ]);
    model.undo();
    model.undo();
    model.undo();
    const back = model.getView();
    const shown = back.docOverlays.filter((o) => !back.hidden.has(o.opId));
    expect(
      (shown[0].params as { content: { text: string } }).content.text,
    ).toBe('DRAFT');
  });

  it('refuses page selections that do not fit and empty headers', () => {
    const model = makeModel();
    expect(() =>
      model.dispatch(hf({ pages: { mode: 'ranges', text: '7-9' } })),
    ).toThrow();
    expect(() =>
      model.dispatch(
        hf({
          header: { left: '', center: '', right: '' },
          footer: { left: '', center: '', right: '' },
        }),
      ),
    ).toThrow(/Type a header or a footer/);
  });
});

describe('markup writers', () => {
  let base: Uint8Array;
  beforeAll(async () => {
    base = await makeTextPdf({ pages: 3, label: 'Alpha' });
  });
  const rpc = () => ({
    signal: new AbortController().signal,
    progress: () => {},
  });
  const run = (overlays: OverlayItem[], filename?: string) =>
    materialize(
      {
        ...(filename ? { filename } : {}),
        base,
        baseSourceId: 's0',
        sources: {},
        assets: {},
        pages: [0, 1, 2].map((i) => ({
          id: `ckpt0:${i}`,
          source: 's0',
          index: i,
          rotate: 0 as const,
        })),
        pageLabels: null,
        overlays,
      },
      rpc(),
    );

  it('{filename} is the exported file name', async () => {
    const model = makeModel();
    model.dispatch(hf());
    const out = await run([...model.getView().docOverlays], 'final.edited.pdf');
    const p1 = (await textPositions(out.bytes, 0)).map((t) => t.str);
    expect(p1).toContain('final.edited.pdf');
    expect(p1).not.toContain('report.pdf');
  });

  it('writes header, footer, watermark and page numbers', async () => {
    const model = makeModel();
    model.dispatch(hf({ pages: { mode: 'ranges', text: '1-2' } }));
    model.dispatch(wm('DRAFT'));
    model.dispatch({
      type: 'markup.pageNumbers',
      params: {
        id: 'pn',
        format: 'page-n',
        position: 'bottom-right',
        startAt: 1,
        pages: { mode: 'all' },
        fontSize: 10,
        margin: 24,
      },
    });
    const out = await run(
      model
        .getView()
        .docOverlays.filter((o) => !model.getView().hidden.has(o.opId)),
    );
    const p1 = (await textPositions(out.bytes, 0)).map((t) => t.str);
    expect(p1).toEqual(
      expect.arrayContaining(['report.pdf', 'Page 1 of 3', 'DRAFT', 'Page 1']),
    );
    const p3 = (await textPositions(out.bytes, 2)).map((t) => t.str);
    expect(p3).not.toContain('Page 3 of 3');
    expect(p3).toContain('Page 3');
  });

  it('header and footer sit at the visual top and bottom of a rotated page', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]).setRotation(degrees(90));
    await headerFooterDoc(doc, {
      header: { left: 'Top', center: '', right: '' },
      footer: { left: '', center: '', right: 'Bottom' },
      fontSize: 10,
      color: '#000000',
      margin: { top: 20, bottom: 20, side: 30 },
      pages: { mode: 'all' },
      filename: 'a.pdf',
      date: new Date(),
    });
    const pos = await textPositions(await doc.save(), 0);
    const top = pos.find((p) => p.str === 'Top')!;
    const bottom = pos.find((p) => p.str === 'Bottom')!;
    expect(top.viewport).toEqual({ width: 792, height: 612 });
    expect(top.upright).toBe(true);
    expect(top.y).toBeLessThan(40);
    expect(top.x).toBeLessThan(40);
    expect(bottom.y).toBeGreaterThan(612 - 30);
    expect(bottom.x).toBeGreaterThan(792 / 2);
  });

  it('the preview anchor equals the writer anchor', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    page.setRotation(degrees(270));
    const o = {
      header: { left: '', center: 'Centre', right: '' },
      footer: { left: 'Foot', center: '', right: '' },
      fontSize: 12,
      margin: { top: 30, bottom: 30, side: 40 },
    };
    await headerFooterDoc(doc, {
      ...o,
      color: '#000000',
      pages: { mode: 'all' },
      filename: '',
      date: new Date(),
    });
    const font = doc.embedStandardFont(StandardFonts.Helvetica);
    const placed = headerFooterPlacements(pageFrame(page), o, {
      width: (t, s) => font.widthOfTextAtSize(t, s),
      height: (s) => font.heightAtSize(s, { descender: false }),
    });
    const vp = pageViewport({ view: [0, 0, 612, 792], rotate: 270 }, 0, 1);
    const pos = await textPositions(await doc.save(), 0);
    for (const p of placed) {
      const drawn = pos.find((d) => d.str === p.text)!;
      const [sx, sy] = toScreen(vp, p.x, p.y);
      expect(drawn.x).toBeCloseTo(sx, 3);
      expect(drawn.y).toBeCloseTo(sy, 3);
    }
  });
});
