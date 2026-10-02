import { PDFDocument, PDFName, type PDFDict } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { loadFontMetrics, type FontMetrics } from './font-metrics';

const font = async (dict: Record<string, unknown>) => {
  const doc = await PDFDocument.create();
  return { doc, font: doc.context.obj(dict as never) as unknown as PDFDict };
};

const metrics = (doc: PDFDocument, d: PDFDict): FontMetrics => {
  const m = loadFontMetrics(doc, d);
  if ('raster' in m) throw new Error(m.raster);
  return m;
};

describe('loadFontMetrics', () => {
  it('reads standard 14 widths through the encoding when /Widths is absent', async () => {
    const { doc, font: f } = await font({
      Type: 'Font',
      Subtype: 'Type1',
      BaseFont: 'Helvetica',
      Encoding: 'WinAnsiEncoding',
    });
    const m = metrics(doc, f);
    expect(m.kind).toBe('simple');
    expect(m.width(65)).toBeCloseTo(0.667, 6);
    expect(m.codeLength(new Uint8Array([65, 66]), 0)).toBe(1);
    expect(m.isSpace(32, 1)).toBe(true);
    expect(m.ascent).toBeGreaterThan(0);
    expect(m.descent).toBeLessThan(0);
  });

  it('applies /Differences on top of the base encoding', async () => {
    const { doc, font: f } = await font({
      Type: 'Font',
      Subtype: 'Type1',
      BaseFont: 'Helvetica',
    });
    f.set(
      PDFName.of('Encoding'),
      doc.context.obj({ Type: 'Encoding', Differences: [65, 'W'] }),
    );
    // Helvetica W is 944 units wide.
    expect(metrics(doc, f).width(65)).toBeCloseTo(0.944, 6);
  });

  it('reads /FirstChar and /Widths of a TrueType font', async () => {
    const { doc, font: f } = await font({
      Type: 'Font',
      Subtype: 'TrueType',
      BaseFont: 'SomeSans',
      FirstChar: 65,
      LastChar: 66,
      Widths: [500, 600],
    });
    const m = metrics(doc, f);
    expect(m.width(65)).toBe(0.5);
    expect(m.width(66)).toBe(0.6);
    expect(m.width(90)).toBe(0);
  });

  it('reads /W and /DW of an Identity-H CID font', async () => {
    const doc = await PDFDocument.create();
    const cid = doc.context.obj({
      Type: 'Font',
      Subtype: 'CIDFontType2',
      BaseFont: 'Noto',
      W: [1, [500, 600], 10, 12, 300],
    });
    const f = doc.context.obj({
      Type: 'Font',
      Subtype: 'Type0',
      BaseFont: 'Noto',
      Encoding: 'Identity-H',
      DescendantFonts: [doc.context.register(cid)],
    }) as PDFDict;
    const m = metrics(doc, f);
    expect(m.kind).toBe('cid');
    expect(m.codeLength(new Uint8Array([0, 1, 0, 2]), 0)).toBe(2);
    expect(m.width(1)).toBe(0.5);
    expect(m.width(2)).toBe(0.6);
    expect(m.width(11)).toBe(0.3);
    expect(m.width(5)).toBe(1);
    expect(m.isSpace(32, 2)).toBe(false);
  });

  it('scales Type 3 widths by FontMatrix', async () => {
    const { doc, font: f } = await font({
      Type: 'Font',
      Subtype: 'Type3',
      FontMatrix: [0.001, 0, 0, 0.001, 0, 0],
      FontBBox: [0, -200, 1000, 800],
      FirstChar: 65,
      LastChar: 65,
      Widths: [500],
    });
    const m = metrics(doc, f);
    expect(m.kind).toBe('type3');
    expect(m.width(65)).toBeCloseTo(0.5, 9);
    expect(m.ascent).toBeCloseTo(0.8, 9);
    expect(m.descent).toBeCloseTo(-0.2, 9);
  });

  it('returns raster reasons for fonts it cannot measure', async () => {
    const a = await font({
      Type: 'Font',
      Subtype: 'TrueType',
      BaseFont: 'Mystery',
    });
    expect(loadFontMetrics(a.doc, a.font)).toEqual({
      raster: 'font-no-widths',
    });
    const b = await font({
      Type: 'Font',
      Subtype: 'Type3',
      FontMatrix: [0.001, 0, 0, 0.001, 0, 0],
    });
    expect(loadFontMetrics(b.doc, b.font)).toEqual({
      raster: 'type3-no-metrics',
    });
    const c = await font({
      Type: 'Font',
      Subtype: 'Type0',
      Encoding: 'UniJIS-UCS2-H',
      DescendantFonts: [{ Type: 'Font', Subtype: 'CIDFontType0', DW: 1000 }],
    });
    expect(loadFontMetrics(c.doc, c.font)).toEqual({
      raster: 'unsupported-cmap',
    });
  });
});
