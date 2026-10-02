import { PDFDocument, type PDFDict } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { IDENTITY, interpret, quadBox } from './interpreter';
import { parseContent } from './lexer';
import { fromLatin1 } from './tokens';

async function setup() {
  const doc = await PDFDocument.create();
  const f1 = doc.context.register(
    doc.context.obj({
      Type: 'Font',
      Subtype: 'Type1',
      BaseFont: 'Helvetica',
      Encoding: 'WinAnsiEncoding',
    }),
  );
  const img = doc.context.register(
    doc.context.stream(new Uint8Array(3), {
      Type: 'XObject',
      Subtype: 'Image',
      Width: 1,
      Height: 1,
      ColorSpace: 'DeviceRGB',
      BitsPerComponent: 8,
    }),
  );
  const form = doc.context.register(
    doc.context.stream(new Uint8Array(0), {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [0, 0, 10, 10],
    }),
  );
  const resources = doc.context.obj({
    Font: { F1: f1 },
    XObject: { Im0: img, Fm0: form },
    ColorSpace: { P0: ['Pattern'] },
  }) as PDFDict;
  const run = (s: string) =>
    interpret(parseContent(fromLatin1(s)), resources, doc, IDENTITY);
  return { run };
}

const A = 0.667 * 12;

describe('interpret text', () => {
  it('positions glyphs of a Tj', async () => {
    const { run } = await setup();
    const r = run('BT /F1 12 Tf 72 700 Td (AB) Tj ET');
    expect(r.glyphs).toHaveLength(2);
    const [a, b] = r.glyphs.map((g) => quadBox(g.quad));
    expect(a.x).toBeCloseTo(72, 6);
    expect(b.x).toBeCloseTo(72 + A, 6);
    expect(a.width).toBeCloseTo(A, 6);
    expect(a.y).toBeLessThan(700);
    expect(a.y + a.height).toBeGreaterThan(700 + 6);
    expect(r.glyphs[0]).toMatchObject({
      op: 3,
      part: 0,
      byteStart: 0,
      byteLength: 1,
      code: 65,
    });
    expect(r.glyphs[0].advance).toBeCloseTo(A, 6);
    expect(r.shows.get(3)).toEqual({ font: 'F1', tfs: 12, th: 1 });
  });

  it('applies TJ numbers', async () => {
    const { run } = await setup();
    const r = run('BT /F1 12 Tf 72 700 Td [(A) -500 (B)] TJ ET');
    const b = quadBox(r.glyphs[1].quad);
    expect(b.x).toBeCloseTo(72 + A + 6, 6);
    expect(r.glyphs[1].part).toBe(2);
  });

  it('applies Tc and Tw (Tw only on the space)', async () => {
    const { run } = await setup();
    const r = run('BT /F1 10 Tf 2 Tc 3 Tw 0 0 Td (A A) Tj ET');
    const xs = r.glyphs.map((g) => quadBox(g.quad).x);
    const space = 0.278 * 10;
    expect(xs[1]).toBeCloseTo(6.67 + 2, 6);
    expect(xs[2]).toBeCloseTo(6.67 + 2 + space + 2 + 3, 6);
  });

  it('scales horizontally with Tz', async () => {
    const { run } = await setup();
    const r = run('BT /F1 12 Tf 150 Tz 0 0 Td (AB) Tj ET');
    expect(quadBox(r.glyphs[1].quad).x).toBeCloseTo(A * 1.5, 6);
    expect(r.shows.get(4)?.th).toBe(1.5);
  });

  it('rotates glyph quads with Tm', async () => {
    const { run } = await setup();
    const r = run('BT /F1 10 Tf 0 1 -1 0 100 100 Tm (A) Tj ET');
    const [ul, ur, ll, lr] = r.glyphs[0].quad;
    // Baseline runs up the page from (100, 100).
    expect(ll[0]).toBeCloseTo(100 + 10 * 0.207, 3);
    expect(ll[1]).toBeCloseTo(100, 6);
    expect(lr[1]).toBeCloseTo(106.67, 6);
    expect(ul[0]).toBeLessThan(ll[0]);
    expect(ur[1]).toBeCloseTo(106.67, 6);
  });

  it('scales with cm and restores with Q', async () => {
    const { run } = await setup();
    const r = run(
      'q 2 0 0 2 0 0 cm BT /F1 10 Tf 10 10 Td (A) Tj ET Q BT /F1 10 Tf 10 10 Td (A) Tj ET',
    );
    const [a, b] = r.glyphs.map((g) => quadBox(g.quad));
    expect(a.x).toBeCloseTo(20, 6);
    expect(a.width).toBeCloseTo(13.34, 6);
    expect(b.x).toBeCloseTo(10, 6);
  });

  it('handles TL, T*, quote and double quote', async () => {
    const { run } = await setup();
    const r = run('BT /F1 10 Tf 14 TL 0 100 Td (A) Tj (A) \' 1 2 (A) " ET');
    // LL corners sit at the baseline plus the descent.
    const ys = r.glyphs.map(
      (g) => g.quad[2][1] - r.fonts.get('F1')!.descent * 10,
    );
    expect(ys.map((y) => Math.round(y * 1e6) / 1e6)).toEqual([100, 86, 72]);
    expect(quadBox(r.glyphs[2].quad).x).toBeCloseTo(0, 6);
  });

  it('keeps glyphs of invisible text and flags clipping text', async () => {
    const { run } = await setup();
    expect(run('BT /F1 10 Tf 3 Tr (A) Tj ET').glyphs).toHaveLength(1);
    expect(run('BT /F1 10 Tf 3 Tr (A) Tj ET').raster).toEqual([]);
    expect(run('BT /F1 10 Tf 7 Tr (A) Tj ET').raster).toEqual(['clip-text']);
  });

  it('flags text painted with a pattern', async () => {
    const { run } = await setup();
    expect(run('/P0 cs /Sh1 scn BT /F1 10 Tf (A) Tj ET').raster).toEqual([
      'pattern-text',
    ]);
    expect(
      run('/Pattern cs /Sh1 scn 0 g BT /F1 10 Tf (A) Tj ET').raster,
    ).toEqual([]);
  });

  it('flags a missing font', async () => {
    const { run } = await setup();
    expect(run('BT /F9 10 Tf (A) Tj ET').raster).toEqual(['parse-error']);
  });
});

describe('interpret images, forms and paths', () => {
  it('marks paths painted with a pattern', async () => {
    const { run } = await setup();
    const r = run('/P0 cs /T1 scn 0 0 5 5 re f 0 g 1 1 2 2 re f');
    expect(r.paths.map((p) => p.pattern)).toEqual([true, false]);
  });

  it('gives the image unit-square transform', async () => {
    const { run } = await setup();
    const r = run('q 100 0 0 50 10 20 cm /Im0 Do Q /Fm0 Do');
    expect(r.images).toEqual([
      { op: 2, name: 'Im0', inline: false, ctm: [100, 0, 0, 50, 10, 20] },
    ]);
    expect(r.forms).toEqual([{ op: 4, name: 'Fm0', ctm: IDENTITY }]);
  });

  it('records inline images', async () => {
    const { run } = await setup();
    const r = run('q 5 0 0 5 1 1 cm BI /W 1 /H 1 /CS /G /BPC 8 ID \x00 EI Q');
    expect(r.images).toEqual([
      { op: 2, name: null, inline: true, ctm: [5, 0, 0, 5, 1, 1] },
    ]);
  });

  it('records painted, unpainted and clipping paths', async () => {
    const { run } = await setup();
    const r = run('10 10 50 50 re f 0 0 m 5 5 l S 1 1 2 2 re W n');
    expect(r.paths).toEqual([
      {
        opStart: 0,
        opEnd: 1,
        bbox: { x: 10, y: 10, width: 50, height: 50 },
        painted: true,
        clip: false,
        pattern: false,
      },
      {
        opStart: 2,
        opEnd: 4,
        bbox: { x: 0, y: 0, width: 5, height: 5 },
        painted: true,
        clip: false,
        pattern: false,
      },
      {
        opStart: 5,
        opEnd: 7,
        bbox: { x: 1, y: 1, width: 2, height: 2 },
        painted: false,
        clip: true,
        pattern: false,
      },
    ]);
  });
});
