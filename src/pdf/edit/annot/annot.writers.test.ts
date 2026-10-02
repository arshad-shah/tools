import { describe, expect, it } from 'vitest';
import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFDocument,
  PDFRawStream,
  decodePDFRawStream,
  StandardFonts,
} from 'pdf-lib';
import { encodePng, noiseImage } from '../../../../test/fixtures/images';
import { writeFreeText, freeTextLayout } from './freetext';
import { writeInk } from './ink';
import { writeLine } from './line';
import { writeNote } from './note';
import { writeShape } from './shapes';
import { rdp } from './simplify';
import { STAMP_LABELS, STAMP_PRESETS, writeStamp } from './stamp';
import { base, blankDoc, readAnnotations, renderPage } from './test-helpers';

const byNm = async (bytes: Uint8Array, nm: string) => {
  const doc = await PDFDocument.load(bytes);
  const annots = doc.getPage(0).node.lookup(PDFName.of('Annots'), PDFArray);
  for (let i = 0; i < annots.size(); i++) {
    const d = annots.lookup(i, PDFDict);
    if (d.get(PDFName.of('NM'))?.toString() === `(${nm})`) return d;
  }
  throw new Error(`no ${nm}`);
};

describe('rdp', () => {
  it('reduces a dense straight stroke to its ends', () => {
    const pts = Array.from(
      { length: 100 },
      (_, i) => [i, 2 * i] as [number, number],
    );
    expect(rdp(pts, 0.5)).toEqual([
      [0, 0],
      [99, 198],
    ]);
  });
  it('keeps corners', () => {
    expect(
      rdp([
        [0, 0],
        [5, 0],
        [10, 0],
        [10, 5],
        [10, 10],
      ]),
    ).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
  });
});

describe('writeNote', () => {
  it('writes a Text note with a popup, and a reply', async () => {
    const { doc, page } = await blankDoc();
    const parent = base({ contents: 'Question', author: 'Ann' });
    const refs = new Map<string, ReturnType<typeof writeNote>>();
    const parentRef = writeNote(
      doc,
      page,
      { ...parent, at: [100, 600], icon: 'Comment', open: false },
      () => null,
    );
    refs.set(parent.nm, parentRef);
    writeNote(
      doc,
      page,
      {
        ...base({ contents: 'Answer' }),
        at: [130, 600],
        icon: 'Note',
        open: false,
        replyTo: parent.nm,
      },
      (nm) => refs.get(nm) ?? null,
    );
    const bytes = await doc.save();
    const annots = await readAnnotations(bytes);
    const texts = annots.filter((a) => a.subtype === 'Text');
    expect(texts).toHaveLength(2);
    const [q, a] = texts;
    expect(q.popupRef).toBeTruthy();
    expect(annots.some((x) => x.subtype === 'Popup')).toBe(true);
    expect(q.contentsObj.str).toBe('Question');
    expect(a.inReplyTo).toBe(q.id);
    const dict = await byNm(bytes, parent.nm);
    expect(dict.get(PDFName.of('Name'))).toBe(PDFName.of('Comment'));
    const r = await renderPage(bytes);
    expect(r.inked({ x: 100, y: 600, width: 20, height: 20 })).toBeGreaterThan(
      50,
    );
  });

  it('refuses a reply to a missing note', async () => {
    const { doc, page } = await blankDoc();
    expect(() =>
      writeNote(
        doc,
        page,
        { ...base(), at: [1, 1], icon: 'Note', open: false, replyTo: 'gone' },
        () => null,
      ),
    ).toThrow(/no longer/);
  });
});

describe('writeFreeText', () => {
  it('wraps the text inside the rect and draws it', async () => {
    const { doc, page } = await blankDoc();
    const p = {
      ...base({ color: '#000000' }),
      rect: { x: 100, y: 500, width: 120, height: 80 },
      text: 'A longer comment that has to wrap',
      fontSize: 12,
      align: 'left' as const,
      border: true,
    };
    writeFreeText(doc, page, p);
    const bytes = await doc.save();
    const [a] = await readAnnotations(bytes);
    expect(a.subtype).toBe('FreeText');
    expect(a.contentsObj.str).toBe(p.text);
    const font = (await PDFDocument.create()).embedStandardFont(
      StandardFonts.Helvetica,
    );
    const { lines } = freeTextLayout(font, p);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe(p.text);
    // The appearance draws each wrapped line.
    const dict = await byNm(bytes, p.nm);
    const ap = dict.lookup(PDFName.of('AP'), PDFDict);
    const stream = ap.lookup(PDFName.of('N')) as PDFRawStream;
    const content = new TextDecoder().decode(
      decodePDFRawStream(stream).decode(),
    );
    expect(content.match(/ Tj/g)).toHaveLength(lines.length);
    expect(dict.get(PDFName.of('DA'))?.toString()).toBe(
      '(/Helv 12 Tf 0 0 0 rg)',
    );
    const r = await renderPage(bytes);
    expect(r.inked({ x: 103, y: 503, width: 114, height: 74 })).toBeGreaterThan(
      50,
    );
  });

  it('refuses characters Helvetica cannot draw', async () => {
    const { doc, page } = await blankDoc();
    expect(() =>
      writeFreeText(doc, page, {
        ...base(),
        rect: { x: 0, y: 0, width: 50, height: 50 },
        text: String.fromCodePoint(0x4e2d),
        fontSize: 12,
        align: 'left',
        border: false,
      }),
    ).toThrow();
  });
});

describe('writeInk', () => {
  it('simplifies strokes into /InkList and renders them', async () => {
    const { doc, page } = await blankDoc();
    const stroke = Array.from(
      { length: 100 },
      (_, i) => [100 + i, 400] as [number, number],
    );
    writeInk(doc, page, {
      ...base({ color: '#ff0000' }),
      strokes: [
        stroke,
        [
          [300, 300],
          [350, 350],
          [400, 300],
        ],
      ],
      width: 3,
    });
    const bytes = await doc.save();
    const [a] = await readAnnotations(bytes);
    expect(a.subtype).toBe('Ink');
    expect(a.inkLists.map((l: ArrayLike<number>) => l.length / 2)).toEqual([
      2, 3,
    ]);
    const r = await renderPage(bytes);
    expect(r.inked({ x: 100, y: 397, width: 99, height: 6 })).toBeGreaterThan(
      50,
    );
  });
  it('refuses an empty drawing', async () => {
    const { doc, page } = await blankDoc();
    expect(() =>
      writeInk(doc, page, { ...base(), strokes: [[]], width: 1 }),
    ).toThrow(/nothing drawn/);
  });
});

describe('writeShape', () => {
  it.each(['Square', 'Circle'] as const)('%s with fill', async (kind) => {
    const { doc, page } = await blankDoc();
    const p = base({ color: '#0000ff' });
    writeShape(doc, page, {
      ...p,
      kind,
      rect: { x: 100, y: 100, width: 100, height: 60 },
      width: 2,
      fill: '#5fd068',
    });
    const bytes = await doc.save();
    const [a] = await readAnnotations(bytes);
    expect(a.subtype).toBe(kind);
    // pdf.js does not expose /IC; read it back with pdf-lib.
    const ic = (await byNm(bytes, p.nm)).lookup(PDFName.of('IC'), PDFArray);
    expect(
      ic.asArray().map((n) => Math.round(Number(n.toString()) * 255)),
    ).toEqual([95, 208, 104]);
    const r = await renderPage(bytes);
    const [red, green] = r.mean({ x: 140, y: 120, width: 20, height: 20 });
    expect(green).toBeGreaterThan(red + 50);
  });
  it('has no /IC without fill', async () => {
    const { doc, page } = await blankDoc();
    const p = base();
    writeShape(doc, page, {
      ...p,
      kind: 'Square',
      rect: { x: 100, y: 100, width: 100, height: 60 },
      width: 2,
      fill: null,
    });
    const bytes = await doc.save();
    expect((await byNm(bytes, p.nm)).get(PDFName.of('IC'))).toBeUndefined();
  });
});

describe('writeLine', () => {
  it('writes an arrow with OpenArrow ending', async () => {
    const { doc, page } = await blankDoc();
    writeLine(doc, page, {
      ...base({ color: '#000000' }),
      from: [100, 100],
      to: [300, 200],
      width: 2,
      arrowEnd: true,
    });
    const bytes = await doc.save();
    const [a] = await readAnnotations(bytes);
    expect(a.subtype).toBe('Line');
    expect(a.lineEndings).toEqual(['None', 'OpenArrow']);
    expect([...a.lineCoordinates]).toEqual([100, 100, 300, 200]);
    const r = await renderPage(bytes);
    expect(r.inked({ x: 190, y: 140, width: 20, height: 20 })).toBeGreaterThan(
      5,
    );
  });
  it('a plain line has no endings', async () => {
    const { doc, page } = await blankDoc();
    writeLine(doc, page, {
      ...base(),
      from: [100, 100],
      to: [300, 100],
      width: 1,
      arrowEnd: false,
    });
    const [a] = await readAnnotations(await doc.save());
    expect(a.lineEndings).toEqual(['None', 'None']);
  });
});

describe('writeStamp', () => {
  it('labels every preset', () => {
    expect(STAMP_PRESETS).toHaveLength(6);
    expect(STAMP_LABELS.NotApproved).toBe('NOT APPROVED');
  });
  it('writes a preset stamp with /Name and a visible appearance', async () => {
    const { doc, page } = await blankDoc();
    const p = {
      ...base({ color: '#ff4d4d' }),
      rect: { x: 100, y: 600, width: 180, height: 50 },
      preset: 'Approved' as const,
    };
    await writeStamp(doc, page, p);
    const bytes = await doc.save();
    const [a] = await readAnnotations(bytes);
    expect(a.subtype).toBe('Stamp');
    expect(a.contentsObj.str).toBe('APPROVED');
    expect((await byNm(bytes, p.nm)).get(PDFName.of('Name'))).toBe(
      PDFName.of('Approved'),
    );
    const r = await renderPage(bytes);
    expect(r.inked({ x: 110, y: 610, width: 160, height: 30 })).toBeGreaterThan(
      100,
    );
  });
  it('draws an image stamp', async () => {
    const { doc, page } = await blankDoc();
    const png = encodePng(32, 32, noiseImage(32, 32, 4, 7));
    await writeStamp(doc, page, {
      ...base(),
      rect: { x: 100, y: 100, width: 64, height: 64 },
      image: { bytes: png, mime: 'image/png' },
    });
    const bytes = await doc.save();
    const [a] = await readAnnotations(bytes);
    expect(a.subtype).toBe('Stamp');
    const r = await renderPage(bytes);
    expect(r.inked({ x: 102, y: 102, width: 60, height: 60 })).toBeGreaterThan(
      500,
    );
  });
  it('refuses a bad image', async () => {
    const { doc, page } = await blankDoc();
    await expect(
      writeStamp(doc, page, {
        ...base(),
        rect: { x: 1, y: 1, width: 10, height: 10 },
        image: { bytes: new Uint8Array([1, 2, 3]), mime: 'image/png' },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_FILE' });
  });
});
