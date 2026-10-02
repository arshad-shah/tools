import { zlibSync } from 'fflate';
import {
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFString,
  StandardFonts,
  type PDFRef,
} from 'pdf-lib';
import { makeContentPdf, type ContentPage } from './content';

export const REDACT_TERM = 'TOPSECRET-42';

/** Where `makeRedactBasic` puts everything that must go (page 1, user space). */
export const BASIC_MARK = { x: 60, y: 560, width: 300, height: 160 };

const solidRgb = (w: number, h: number, rgb: [number, number, number]) => {
  const out = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) out.set(rgb, i * 3);
  return out;
};

/** Adds a Flate RGB image XObject and returns its ref. */
export function addRgbImage(
  doc: PDFDocument,
  w: number,
  h: number,
  rgb: [number, number, number],
): PDFRef {
  const data = zlibSync(solidRgb(w, h, rgb));
  return doc.context.register(
    doc.context.stream(data, {
      Type: 'XObject',
      Subtype: 'Image',
      Width: w,
      Height: h,
      ColorSpace: 'DeviceRGB',
      BitsPerComponent: 8,
      Filter: 'FlateDecode',
    }),
  );
}

/** Adds an outline with one item per title. */
export function addOutline(doc: PDFDocument, titles: string[]) {
  const { context } = doc;
  const root = context.nextRef();
  const refs = titles.map(() => context.nextRef());
  titles.forEach((t, i) =>
    context.assign(
      refs[i],
      context.obj({
        Title: PDFHexString.fromText(t),
        Parent: root,
        ...(i > 0 ? { Prev: refs[i - 1] } : {}),
        ...(i < titles.length - 1 ? { Next: refs[i + 1] } : {}),
        Dest: [doc.getPage(0).ref, PDFName.of('Fit')],
      }),
    ),
  );
  context.assign(
    root,
    context.obj({
      Type: 'Outlines',
      First: refs[0],
      Last: refs[refs.length - 1],
      Count: titles.length,
    }),
  );
  doc.catalog.set(PDFName.of('Outlines'), root);
}

/**
 * Page 1: the term as text, an image, a filled square, a note annotation
 * and a text field, all inside BASIC_MARK, plus text outside it. Page 2:
 * untouched text. Tagged (StructTreeRoot), an outline item and the Info
 * title carry the term; an XMP packet mirrors Info.
 */
export async function makeRedactBasic(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([612, 792]);
  const p2 = doc.addPage([612, 792]);
  p1.drawText(`Account ${REDACT_TERM} closed`, {
    x: 72,
    y: 700,
    size: 14,
    font,
  });
  p1.drawText('Public footer line', { x: 72, y: 100, size: 12, font });
  const img = addRgbImage(doc, 20, 20, [220, 30, 30]);
  const imgName = p1.node.newXObject('Im', img);
  p1.pushOperators();
  p1.node.addContentStream(
    doc.context.register(
      doc.context.stream(
        `q 80 0 0 80 80 580 cm /${imgName.decodeText()} Do Q 0 0 1 rg 200 600 40 40 re f`,
      ),
    ),
  );
  p2.drawText('Second page stays', { x: 72, y: 700, size: 14, font });
  const note = doc.context.register(
    doc.context.obj({
      Type: 'Annot',
      Subtype: 'Text',
      Rect: [300, 600, 320, 620],
      Contents: PDFString.of(`Note about ${REDACT_TERM}`),
    }),
  );
  p1.node.set(PDFName.of('Annots'), doc.context.obj([note]));
  const field = doc.getForm().createTextField('account');
  field.setText(REDACT_TERM);
  field.addToPage(p1, { x: 72, y: 650, width: 200, height: 20, font });
  doc.catalog.set(
    PDFName.of('StructTreeRoot'),
    doc.context.register(doc.context.obj({ Type: 'StructTreeRoot' })),
  );
  doc.catalog.set(PDFName.of('MarkInfo'), doc.context.obj({ Marked: true }));
  addOutline(doc, [`Chapter ${REDACT_TERM}`, 'Introduction']);
  doc.setTitle(`Report ${REDACT_TERM}`);
  doc.setAuthor('Someone');
  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Report ${REDACT_TERM}</rdf:li></rdf:Alt></dc:title></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  doc.catalog.set(
    PDFName.of('Metadata'),
    doc.context.register(
      doc.context.stream(xmp, { Type: 'Metadata', Subtype: 'XML' }),
    ),
  );
  return doc.save({ useObjectStreams: false, updateFieldAppearances: true });
}

/**
 * One page whose text is drawn with a Type 3 font that has no /Widths
 * (so no usable metrics): redaction must turn the page into an image.
 */
export async function makeType3FontPdf(
  text = REDACT_TERM,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const { context } = doc;
  // Every glyph is a filled 600x700 box in glyph space.
  const box = context.register(
    context.stream('600 0 0 0 600 700 d1 0 0 600 700 re f'),
  );
  const codes = [...new Set(text)].map((c) => c.charCodeAt(0));
  const procs: Record<string, PDFRef> = {};
  const diffs: (number | string)[] = [];
  for (const c of codes) {
    procs[`g${c}`] = box;
    diffs.push(c, `g${c}`);
  }
  const t3 = context.register(
    context.obj({
      Type: 'Font',
      Subtype: 'Type3',
      FontBBox: [0, 0, 600, 700],
      FontMatrix: [0.001, 0, 0, 0.001, 0, 0],
      CharProcs: procs,
      Encoding: { Type: 'Encoding', Differences: diffs },
      Resources: {},
    } as never),
  );
  const hex = [...text]
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  page.node.set(
    PDFName.of('Contents'),
    context.register(context.stream(`BT /T3 20 Tf 72 700 Td <${hex}> Tj ET`)),
  );
  page.node.set(PDFName.of('Resources'), context.obj({ Font: { T3: t3 } }));
  return doc.save({ useObjectStreams: false });
}

export const FORM_TERM = 'FORMSECRET-7';

/** Every adversarial page draws its term at (72, 700), size 14, inside this mark. */
export const ADV_MARK = { x: 60, y: 680, width: 320, height: 50 };

/** Marks per page (0-based): the rect and the search term it came from. */
export const ADVERSARIAL_MARKS: { page: number; term?: string }[] = [
  { page: 0, term: REDACT_TERM },
  { page: 1, term: REDACT_TERM },
  { page: 2, term: FORM_TERM },
  { page: 4, term: REDACT_TERM },
  { page: 5, term: REDACT_TERM },
  { page: 6 },
  { page: 7, term: REDACT_TERM },
  { page: 8, term: REDACT_TERM },
  { page: 9, term: REDACT_TERM },
];

const kerned = (t: string) =>
  `[${[...t].map((c, i) => `(${c})${i < t.length - 1 ? ` ${i % 2 ? 37 : -55}` : ''}`).join(' ')}] TJ`;

/**
 * Ten pages, each hiding a term under ADV_MARK in a different way (spec
 * 10.2): 1 text under an opaque image; 2 heavily kerned TJ; 3 and 4 a Form
 * XObject shared by both pages (only page 3 marked, FORM_TERM); 5 an
 * Identity-H CID font; 6 a Type 3 font without metrics; 7 an inline image
 * of "text" pixels; 8 an annotation, the outline and Info; 9 clipping text
 * (7 Tr); 10 a form field value.
 */
export async function makeRedactAdversarial(): Promise<Uint8Array> {
  const pages: ContentPage[] = [];
  const text = (show: string, extra = '') =>
    `BT /F1 14 Tf ${extra} 72 700 Td ${show} ET BT /F1 10 Tf 72 100 Td (Public line) Tj ET`;
  pages.push({
    content: `${text(`(${REDACT_TERM}) Tj`)} q 320 0 0 50 60 680 cm /Im0 Do Q`,
  });
  pages.push({ content: text(kerned(REDACT_TERM)) });
  pages.push({
    content: `q 1 0 0 1 60 680 cm /Fm0 Do Q ${text('(Page three) Tj')}`.replace(
      '72 700',
      '72 650',
    ),
  });
  pages.push({ content: `q 1 0 0 1 60 680 cm /Fm0 Do Q` });
  pages.push({ content: `BT /F2 14 Tf 72 700 Td {noto:${REDACT_TERM}} Tj ET` });
  pages.push({ content: `BT /T3 14 Tf 72 700 Td (${REDACT_TERM}) Tj ET` });
  // A 64x8 gray inline image whose dark columns spell nothing searchable.
  const px = Array.from({ length: 64 * 8 }, (_, i) =>
    (i % 64) % 3 ? 'FF' : '00',
  ).join('');
  pages.push({
    content: `q 400 0 0 60 40 675 cm BI /W 64 /H 8 /CS /G /BPC 8 /F /AHx ID ${px}> EI Q`,
  });
  pages.push({ content: text(`(${REDACT_TERM}) Tj`) });
  pages.push({
    content: text(`(${REDACT_TERM}) Tj`, '7 Tr') + ' 0 0 m 1 1 l S',
  });
  pages.push({ content: text('(Field below) Tj').replace('72 700', '72 760') });
  const base = await makeContentPdf(pages);
  const doc = await PDFDocument.load(base);
  const { context } = doc;
  const font = doc
    .getPage(0)
    .node.Resources()!
    .lookup(PDFName.of('Font'), PDFDict)
    .get(PDFName.of('F1'))!;
  const img = addRgbImage(doc, 10, 10, [40, 40, 40]);
  const form = context.register(
    context.stream(`BT /F1 14 Tf 12 20 Td (${FORM_TERM}) Tj ET`, {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [0, 0, 320, 50],
      Resources: { Font: { F1: font } },
    } as never),
  );
  const res = (i: number) => doc.getPage(i).node.Resources()!;
  res(0).set(PDFName.of('XObject'), context.obj({ Im0: img }));
  for (const i of [2, 3])
    res(i).set(PDFName.of('XObject'), context.obj({ Fm0: form }));
  // Page 6: a Type 3 font with no /Widths (no usable metrics).
  const box = context.register(
    context.stream('600 0 0 0 600 700 d1 0 0 600 700 re f'),
  );
  const diffs: (number | string)[] = [];
  const procs: Record<string, PDFRef> = {};
  for (const c of new Set(REDACT_TERM)) {
    diffs.push(c.charCodeAt(0), `g${c.charCodeAt(0)}`);
    procs[`g${c.charCodeAt(0)}`] = box;
  }
  const t3 = context.register(
    context.obj({
      Type: 'Font',
      Subtype: 'Type3',
      FontBBox: [0, 0, 600, 700],
      FontMatrix: [0.001, 0, 0, 0.001, 0, 0],
      CharProcs: procs,
      Encoding: { Type: 'Encoding', Differences: diffs },
      Resources: {},
    } as never),
  );
  res(5).lookup(PDFName.of('Font'), PDFDict).set(PDFName.of('T3'), t3);
  // Page 8: annotation, outline and Info carry the term.
  const note = context.register(
    context.obj({
      Type: 'Annot',
      Subtype: 'Text',
      Rect: [300, 690, 320, 710],
      Contents: PDFString.of(`See ${REDACT_TERM}`),
    }),
  );
  doc.getPage(7).node.set(PDFName.of('Annots'), context.obj([note]));
  addOutline(doc, [`Section ${REDACT_TERM}`]);
  doc.setTitle(`File ${REDACT_TERM}`);
  // Page 10: a text field holding the term under the mark.
  const field = doc.getForm().createTextField('reference');
  field.setText(REDACT_TERM);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  field.addToPage(doc.getPage(9), {
    x: 72,
    y: 690,
    width: 250,
    height: 24,
    font: helv,
  });
  return doc.save({ useObjectStreams: false });
}

export const PATTERN_TERM = 'PATSECRET';
export const SMASK_TERM = 'SMASKSECRET';

/**
 * Page 1: a filled rectangle painted with a tiling pattern whose cell
 * draws PATTERN_TERM as text. Page 2: a rectangle drawn under an
 * ExtGState soft mask whose group draws SMASK_TERM. Both lie inside ADV_MARK.
 */
export async function makeHiddenGraphicsPdf(): Promise<Uint8Array> {
  const base = await makeContentPdf([
    { content: '/Pattern cs /P0 scn 60 680 320 50 re f' },
    { content: 'q /GS0 gs 0 0 1 rg 60 680 320 50 re f Q' },
  ]);
  const doc = await PDFDocument.load(base);
  const { context } = doc;
  const font = doc
    .getPage(0)
    .node.Resources()!
    .lookup(PDFName.of('Font'), PDFDict)
    .get(PDFName.of('F1'))!;
  const pattern = context.register(
    context.stream(`BT /F1 12 Tf 4 20 Td (${PATTERN_TERM}) Tj ET`, {
      Type: 'Pattern',
      PatternType: 1,
      PaintType: 1,
      TilingType: 1,
      BBox: [0, 0, 320, 50],
      XStep: 320,
      YStep: 50,
      Resources: { Font: { F1: font } },
    } as never),
  );
  doc
    .getPage(0)
    .node.Resources()!
    .set(PDFName.of('Pattern'), context.obj({ P0: pattern }));
  const group = context.register(
    context.stream(
      `1 g 0 0 612 792 re f 0 g BT /F1 12 Tf 64 700 Td (${SMASK_TERM}) Tj ET`,
      {
        Type: 'XObject',
        Subtype: 'Form',
        BBox: [0, 0, 612, 792],
        Group: { S: 'Transparency', CS: 'DeviceGray' },
        Resources: { Font: { F1: font } },
      } as never,
    ),
  );
  doc
    .getPage(1)
    .node.Resources()!
    .set(
      PDFName.of('ExtGState'),
      context.obj({
        GS0: {
          Type: 'ExtGState',
          SMask: { Type: 'Mask', S: 'Luminosity', G: group },
        },
      }),
    );
  return doc.save({ useObjectStreams: false });
}

export const LEAK_TERM = 'LEAKSECRET-9';

/**
 * Page 1 shows the term as text under ADV_MARK, and also hides it in places
 * the scrub must reach: document JavaScript and the open action, page /AA, a
 * link URI, a comment far from the mark, an attachment's contents,
 * object-level XMP (on the page) and a form field tooltip (/TU).
 */
export async function makeLeakyPdf(): Promise<Uint8Array> {
  const base = await makeContentPdf([
    {
      content: `BT /F1 14 Tf 72 700 Td (${LEAK_TERM}) Tj ET BT /F1 10 Tf 72 100 Td (Public) Tj ET`,
    },
  ]);
  const doc = await PDFDocument.load(base);
  const c = doc.context;
  const js = (code: string) =>
    c.obj({ S: 'JavaScript', JS: PDFString.of(code) });
  const page = doc.getPage(0);
  doc.catalog.set(
    PDFName.of('Names'),
    c.register(
      c.obj({
        JavaScript: c.obj({
          Names: [
            PDFString.of('init'),
            c.register(js(`var s = "${LEAK_TERM}";`)),
          ],
        }),
        EmbeddedFiles: c.obj({
          Names: [
            PDFString.of('data.txt'),
            c.register(
              c.obj({
                Type: 'Filespec',
                F: PDFString.of('data.txt'),
                EF: c.obj({
                  F: c.register(
                    c.stream(`id ${LEAK_TERM}`, { Type: 'EmbeddedFile' }),
                  ),
                }),
              }),
            ),
          ],
        }),
      }),
    ),
  );
  doc.catalog.set(
    PDFName.of('OpenAction'),
    c.register(js(`app.alert("${LEAK_TERM}")`)),
  );
  page.node.set(PDFName.of('AA'), c.obj({ O: js(`log("${LEAK_TERM}")`) }));
  page.node.set(
    PDFName.of('Metadata'),
    c.register(
      c.stream(`<x:xmpmeta>${LEAK_TERM}</x:xmpmeta>`, {
        Type: 'Metadata',
        Subtype: 'XML',
      }),
    ),
  );
  const link = c.register(
    c.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [400, 300, 500, 320],
      A: { S: 'URI', URI: PDFString.of(`https://example.com/?q=${LEAK_TERM}`) },
    } as never),
  );
  const note = c.register(
    c.obj({
      Type: 'Annot',
      Subtype: 'Text',
      Rect: [400, 200, 420, 220],
      Contents: PDFString.of(`about ${LEAK_TERM}`),
    }),
  );
  page.node.set(PDFName.of('Annots'), c.obj([link, note]));
  const field = doc.getForm().createTextField('ref');
  field.addToPage(page, { x: 72, y: 400, width: 200, height: 20 });
  field.acroField.dict.set(
    PDFName.of('TU'),
    PDFString.of(`Enter ${LEAK_TERM}`),
  );
  return doc.save({ useObjectStreams: false });
}

/** Page 1: a 100x100 red image at (60, 600) whose left half lies under IMAGE_MARK. */
export const IMAGE_MARK = { x: 60, y: 600, width: 50, height: 100 };
export async function makeHalfImagePdf(): Promise<{
  bytes: Uint8Array;
  original: Uint8Array;
}> {
  const doc = await PDFDocument.load(
    await makeContentPdf([{ content: 'q 100 0 0 100 60 600 cm /Im0 Do Q' }]),
  );
  const img = addRgbImage(doc, 100, 100, [250, 10, 10]);
  doc
    .getPage(0)
    .node.Resources()!
    .set(PDFName.of('XObject'), doc.context.obj({ Im0: img }));
  const original = (doc.context.lookup(img) as PDFRawStream).contents.slice();
  return { bytes: await doc.save({ useObjectStreams: false }), original };
}

export const OLD_TERM = 'OLDREVISION-5';

/**
 * A file with an incremental update: revision 1 drew OLD_TERM on page 1,
 * the update replaced that content stream. Readers see the new text only,
 * but the old bytes are still in the file.
 */
export async function makeIncrementalPdf(): Promise<Uint8Array> {
  const base = await makeContentPdf([
    { content: `BT /F1 14 Tf 72 700 Td (${OLD_TERM}) Tj ET` },
  ]);
  const doc = await PDFDocument.load(base);
  const ref = doc.getPage(0).node.get(PDFName.of('Contents')) as PDFRef;
  const text = latin1Text(base);
  const prev = Number(/startxref\s+(\d+)\s+%%EOF\s*$/.exec(text)![1]);
  const size = Number(
    /\/Size (\d+)/.exec(text.slice(text.lastIndexOf('trailer')))![1],
  );
  const root = /\/Root (\d+ \d+ R)/.exec(
    text.slice(text.lastIndexOf('trailer')),
  )![1];
  const body = 'BT /F1 14 Tf 72 700 Td (Current text) Tj ET';
  const obj = `\n${ref.objectNumber} 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj\n`;
  const at = base.length + 1;
  const xrefAt = base.length + obj.length;
  const tail =
    `xref\n0 1\n0000000000 65535 f \n${ref.objectNumber} 1\n${String(at).padStart(10, '0')} 00000 n \n` +
    `trailer\n<< /Size ${size} /Root ${root} /Prev ${prev} >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  const out = new Uint8Array(base.length + obj.length + tail.length);
  out.set(base, 0);
  out.set(new TextEncoder().encode(obj + tail), base.length);
  return out;
}

const latin1Text = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 8192)
    s += String.fromCharCode(...b.subarray(i, i + 8192));
  return s;
};
