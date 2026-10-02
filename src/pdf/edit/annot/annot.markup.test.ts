import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName, PDFArray, PDFDict } from 'pdf-lib';
import { addToPage, baseAnnot, pdfDate, rectArray, textString } from './common';
import { rgbOps } from './appearance';
import { writeTextMarkup, type Quad, type TextMarkupSubtype } from './markup';
import { base, blankDoc, readAnnotations, renderPage } from './test-helpers';

const quad = (x: number, y: number, w: number, h: number): Quad => [
  x,
  y + h,
  x + w,
  y + h,
  x,
  y,
  x + w,
  y,
];

const corners = (flat: ArrayLike<number>) => {
  const out: string[] = [];
  for (let i = 0; i < flat.length; i += 2)
    out.push(`${Math.round(flat[i])},${Math.round(flat[i + 1])}`);
  return out.sort();
};

describe('annotation helpers', () => {
  it('formats PDF dates with the local offset', () => {
    const d = new Date(2026, 0, 2, 3, 4, 5);
    const s = pdfDate(d);
    expect(s).toMatch(/^D:20260102030405[+-]\d{2}'\d{2}'$/);
  });
  it('normalises rectangles', () => {
    expect(rectArray({ x: 10, y: 20, width: -5, height: -10 })).toEqual([
      5, 10, 10, 20,
    ]);
  });
  it('writes ASCII as literal strings and the rest as UTF-16BE', () => {
    expect(textString('Me').toString()).toBe('(Me)');
    expect(textString('a(b').toString()).toMatch(/^<FEFF/);
    const zoe = `Zo${String.fromCodePoint(0xeb)}`;
    expect(textString(zoe).toString()).toBe('<FEFF005A006F00EB>');
  });
  it('rgbOps writes fill and stroke operators', () => {
    expect(rgbOps('#ff0000', false)).toBe('1 0 0 rg');
    expect(rgbOps('#0000ff', true)).toBe('0 0 1 RG');
  });
  it('appends to an indirect /Annots array', async () => {
    const { doc, page } = await blankDoc();
    const arrRef = doc.context.register(doc.context.obj([]));
    page.node.set(PDFName.of('Annots'), arrRef);
    const dict = baseAnnot(
      doc,
      page,
      'Square',
      { x: 1, y: 1, width: 2, height: 2 },
      base(),
    );
    const ref = addToPage(doc, page, dict);
    expect(page.node.get(PDFName.of('Annots'))).toBe(arrRef);
    const arr = doc.context.lookup(arrRef, PDFArray);
    expect(arr.size()).toBe(1);
    expect(arr.get(0)).toBe(ref);
    expect(doc.context.lookup(ref)).toBeInstanceOf(PDFDict);
  });
  it('refuses bad opacity', async () => {
    const { doc, page } = await blankDoc();
    expect(() =>
      baseAnnot(
        doc,
        page,
        'Square',
        { x: 0, y: 0, width: 1, height: 1 },
        base({ opacity: 2 }),
      ),
    ).toThrow(/Opacity/);
  });
});

describe('writeTextMarkup', () => {
  const subtypes: TextMarkupSubtype[] = [
    'Highlight',
    'Underline',
    'StrikeOut',
    'Squiggly',
  ];

  it.each(subtypes)('%s reads back in pdf.js', async (subtype) => {
    const { doc, page } = await blankDoc();
    const quads = [quad(100, 600, 120, 14), quad(100, 580, 80, 14)];
    writeTextMarkup(doc, page, {
      ...base({ color: '#ff4d4d', contents: 'Check this', author: 'Ann' }),
      subtype,
      quads,
    });
    const [a] = await readAnnotations(await doc.save());
    expect(a.subtype).toBe(subtype);
    expect(a.quadPoints.length).toBe(16);
    expect(corners(a.quadPoints)).toEqual(corners(quads.flat()));
    expect([...a.color]).toEqual([255, 77, 77]);
    expect(a.contentsObj.str).toBe('Check this');
    expect(a.titleObj.str).toBe('Ann');
    expect(a.annotationFlags & 4).toBe(4);
  });

  it('round-trips a non-ASCII author', async () => {
    const { doc, page } = await blankDoc();
    const zoe = `Zo${String.fromCodePoint(0xeb)}`;
    writeTextMarkup(doc, page, {
      ...base({ author: zoe }),
      subtype: 'Highlight',
      quads: [quad(100, 600, 50, 12)],
    });
    const [a] = await readAnnotations(await doc.save());
    expect(a.titleObj.str).toBe(zoe);
  });

  it('pdf.js draws the highlight appearance', async () => {
    const { doc, page } = await blankDoc();
    writeTextMarkup(doc, page, {
      ...base({ color: '#4aa8ff', opacity: 0.8 }),
      subtype: 'Highlight',
      quads: [quad(100, 600, 120, 20)],
    });
    const r = await renderPage(await doc.save());
    const [red, , blue] = r.mean({ x: 105, y: 605, width: 110, height: 10 });
    expect(red).toBeLessThan(200);
    expect(blue).toBeGreaterThan(red + 50);
    // Outside the quad stays white.
    expect(r.inked({ x: 300, y: 300, width: 50, height: 50 })).toBe(0);
  });

  it.each(['Underline', 'StrikeOut', 'Squiggly'] as const)(
    '%s draws inside its rect',
    async (subtype) => {
      const { doc, page } = await blankDoc();
      writeTextMarkup(doc, page, {
        ...base({ color: '#000000' }),
        subtype,
        quads: [quad(100, 600, 120, 20)],
      });
      const r = await renderPage(await doc.save());
      expect(
        r.inked({ x: 95, y: 595, width: 130, height: 30 }),
      ).toBeGreaterThan(20);
    },
  );

  it('refuses an empty selection', async () => {
    const { doc, page } = await blankDoc();
    expect(() =>
      writeTextMarkup(doc, page, {
        ...base(),
        subtype: 'Highlight',
        quads: [],
      }),
    ).toThrow(/Select some text/);
  });

  it('keeps existing annotations', async () => {
    const { doc, page } = await blankDoc();
    for (let i = 0; i < 2; i++)
      writeTextMarkup(doc, page, {
        ...base(),
        subtype: 'Underline',
        quads: [quad(100, 600 - i * 30, 50, 12)],
      });
    const reread = await PDFDocument.load(await doc.save());
    expect(
      reread.getPage(0).node.lookup(PDFName.of('Annots'), PDFArray).size(),
    ).toBe(2);
  });
});
