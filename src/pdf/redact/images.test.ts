import { unzlibSync, zlibSync } from 'fflate';
import jpeg from 'jpeg-js';
import {
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  type PDFPage,
} from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { encodeJpeg } from '../../../test/fixtures/images';
import { nodeJpegCodec } from '../../../test/fixtures/jpeg-codec';
import type { Box } from '@/pdf/doc/types';
import { latin1 } from '@/pdf/edit/content/tokens';
import type { RedactPageCtx } from './content';
import { pageContentBytes, redactPageContent } from './page';

const W = 100;
const solid = (comps: number, value: number[]) => {
  const out = new Uint8Array(W * W * comps);
  for (let i = 0; i < W * W; i++)
    for (let c = 0; c < comps; c++) out[i * comps + c] = value[c];
  return out;
};

function image(
  doc: PDFDocument,
  dict: Record<string, unknown>,
  data: Uint8Array,
) {
  const s = PDFRawStream.of(
    doc.context.obj({
      Type: 'XObject',
      Subtype: 'Image',
      Width: W,
      Height: W,
      BitsPerComponent: 8,
      Length: data.length,
      ...dict,
    } as never) as unknown as PDFDict,
    data,
  );
  return doc.context.register(s);
}

function addPage(
  doc: PDFDocument,
  content: string,
  xobjects: Record<string, PDFRef>,
) {
  const page = doc.addPage([612, 792]);
  page.node.set(
    PDFName.of('Contents'),
    doc.context.register(doc.context.stream(content)),
  );
  page.node.set(
    PDFName.of('Resources'),
    doc.context.obj({ XObject: xobjects }),
  );
  return page;
}

const ctx = (doc: PDFDocument): RedactPageCtx => ({
  doc,
  codec: nodeJpegCodec,
  fonts: new WeakMap(),
  fill: [0, 0, 0],
  depth: 0,
  counts: { glyphs: 0, images: 0, paths: 0 },
});

const DRAW = 'q 100 0 0 100 100 100 cm /Im0 Do Q';
const LEFT_HALF: Box = { x: 100, y: 100, width: 50, height: 100 };

function xobject(page: PDFPage, name: string) {
  const res = page.node.Resources()!;
  const xo = res.lookup(PDFName.of('XObject'), PDFDict);
  return {
    ref: xo.get(PDFName.of(name)) as PDFRef,
    stream: xo.lookup(PDFName.of(name)) as PDFRawStream,
  };
}

const content = (doc: PDFDocument, page: PDFPage) =>
  latin1(pageContentBytes(doc, page)!);

describe('image patching', () => {
  it('paints the covered half into a new XObject and leaves the shared original alone', async () => {
    const doc = await PDFDocument.create();
    const original = solid(3, [200, 100, 50]);
    const im = image(
      doc,
      { ColorSpace: 'DeviceRGB', Filter: 'FlateDecode' },
      zlibSync(original),
    );
    const p1 = addPage(doc, DRAW, { Im0: im });
    const p2 = addPage(doc, DRAW, { Im0: im });
    const before = (doc.context.lookup(im) as PDFRawStream).contents.slice();
    const c = ctx(doc);
    const r = await redactPageContent(doc, p1, [LEFT_HALF], c);
    expect(r).toEqual({ raster: [], changed: true });
    expect(c.counts.images).toBe(1);
    expect(content(doc, p1)).toContain('/Rd0 Do');
    const patched = unzlibSync(xobject(p1, 'Rd0').stream.contents);
    for (const [px, py, expected] of [
      [0, 0, [0, 0, 0]],
      [49, 99, [0, 0, 0]],
      [50, 0, [200, 100, 50]],
      [99, 50, [200, 100, 50]],
    ] as const) {
      const o = (py * W + px) * 3;
      expect([...patched.subarray(o, o + 3)]).toEqual(expected);
    }
    expect((doc.context.lookup(im) as PDFRawStream).contents).toEqual(before);
    expect(xobject(p2, 'Im0').ref).toBe(im);
    expect(content(doc, p2)).toContain('/Im0 Do');
  });

  it('re-encodes a patched DCT image as JPEG', async () => {
    const doc = await PDFDocument.create();
    const rgba = solid(4, [30, 160, 220, 255]);
    const im = image(
      doc,
      { ColorSpace: 'DeviceRGB', Filter: 'DCTDecode' },
      encodeJpeg(W, W, rgba, 95),
    );
    const page = addPage(doc, DRAW, { Im0: im });
    await redactPageContent(doc, page, [LEFT_HALF], ctx(doc));
    const s = xobject(page, 'Rd0').stream;
    expect(s.dict.get(PDFName.of('Filter'))).toBe(PDFName.of('DCTDecode'));
    const d = jpeg.decode(s.contents, { useTArray: true });
    const at = (x: number, y: number) => [
      ...d.data.subarray((y * W + x) * 4, (y * W + x) * 4 + 3),
    ];
    at(10, 50).forEach((v) => expect(v).toBeLessThan(12));
    expect(Math.abs(at(90, 50)[1] - 160)).toBeLessThan(12);
  });

  it('makes the covered SMask region opaque', async () => {
    const doc = await PDFDocument.create();
    const smask = image(doc, { ColorSpace: 'DeviceGray' }, solid(1, [0]));
    const im = image(
      doc,
      { ColorSpace: 'DeviceGray', SMask: smask },
      solid(1, [128]),
    );
    const page = addPage(doc, DRAW, { Im0: im });
    await redactPageContent(doc, page, [LEFT_HALF], ctx(doc));
    const s = xobject(page, 'Rd0').stream;
    const sm = s.dict.lookup(PDFName.of('SMask')) as PDFRawStream;
    const alpha = unzlibSync(sm.contents);
    expect(alpha[10 * W + 10]).toBe(255);
    expect(alpha[10 * W + 90]).toBe(0);
    expect(unzlibSync(s.contents)[10 * W + 10]).toBe(0);
  });

  it('removes the draw of a fully covered image', async () => {
    const doc = await PDFDocument.create();
    const im = image(doc, { ColorSpace: 'DeviceGray' }, solid(1, [9]));
    const page = addPage(doc, `${DRAW} 0 0 m 1 1 l S`, { Im0: im });
    await redactPageContent(
      doc,
      page,
      [{ x: 90, y: 90, width: 120, height: 120 }],
      ctx(doc),
    );
    expect(content(doc, page)).not.toContain('Do');
  });

  it('turns a page with a JBIG2 image under a mark into an image', async () => {
    const doc = await PDFDocument.create();
    const im = image(
      doc,
      { ColorSpace: 'DeviceGray', BitsPerComponent: 1, Filter: 'JBIG2Decode' },
      new Uint8Array(10),
    );
    const page = addPage(doc, DRAW, { Im0: im });
    const before = content(doc, page);
    const r = await redactPageContent(doc, page, [LEFT_HALF], ctx(doc));
    expect(r.raster).toEqual(['image-colorspace']);
    expect(content(doc, page)).toBe(before);
    // A JBIG2 image with 8 bits is refused for its filter.
    const im8 = image(
      doc,
      { ColorSpace: 'DeviceGray', Filter: 'JBIG2Decode' },
      new Uint8Array(10),
    );
    const p2 = addPage(doc, DRAW, { Im0: im8 });
    expect(
      (await redactPageContent(doc, p2, [LEFT_HALF], ctx(doc))).raster,
    ).toEqual(['image-filter']);
  });

  it('patches inline images', async () => {
    const doc = await PDFDocument.create();
    const hex = Array.from(solid(1, [200]).subarray(0, 4 * 4), () => 'C8').join(
      '',
    );
    const page = addPage(
      doc,
      `q 40 0 0 40 100 100 cm BI /W 4 /H 4 /CS /G /BPC 8 /F /AHx ID ${hex}> EI Q`,
      {},
    );
    await redactPageContent(
      doc,
      page,
      [{ x: 100, y: 100, width: 20, height: 40 }],
      ctx(doc),
    );
    const text = content(doc, page);
    expect(text).not.toContain('C8C8C8C8');
    expect(text).toMatch(/BI \/W 4 \/H 4 \/CS \/G \/BPC 8 \/F \[\/AHx \/Fl\]/);
  });
});

describe('form XObjects', () => {
  it('clones a shared form for the redacted page only', async () => {
    const doc = await PDFDocument.create();
    const font = doc.context.register(
      doc.context.obj({
        Type: 'Font',
        Subtype: 'Type1',
        BaseFont: 'Helvetica',
        Encoding: 'WinAnsiEncoding',
      }),
    );
    const formStream = doc.context.stream(
      'BT /F1 12 Tf 10 10 Td (SECRET) Tj ET',
      {
        Type: 'XObject',
        Subtype: 'Form',
        BBox: [0, 0, 200, 50],
        Resources: { Font: { F1: font } },
      },
    );
    const form = doc.context.register(formStream);
    const draw = 'q 1 0 0 1 100 600 cm /Fm0 Do Q';
    const p1 = addPage(doc, draw, { Fm0: form });
    const p2 = addPage(doc, draw, { Fm0: form });
    const c = ctx(doc);
    const r = await redactPageContent(
      doc,
      p1,
      [{ x: 105, y: 600, width: 60, height: 30 }],
      c,
    );
    expect(r.changed).toBe(true);
    expect(c.counts.glyphs).toBe(6);
    expect(content(doc, p1)).toContain('/Rd0 Do');
    const clone = xobject(p1, 'Rd0');
    expect(clone.ref).not.toBe(form);
    expect(latin1(unzlibSync(clone.stream.contents))).not.toContain('SECRET');
    expect(xobject(p2, 'Fm0').ref).toBe(form);
    expect(
      latin1((doc.context.lookup(form) as PDFRawStream).contents),
    ).toContain('(SECRET)');
  });
});
