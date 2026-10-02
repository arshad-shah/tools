import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import {
  degrees,
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { textItemsFrom } from '../../src/pdf/render/text';
import type { PageTextItems } from '../../src/pdf/render';
import type { Box } from '../../src/pdf/doc/types';
import type {
  FieldType,
  OperatorListLike,
  OpsTable,
} from '../../src/pdf/detect/types';
import { encodeJpeg } from './images';

/** What the render worker hands `extractGeometry` for one page. */
export interface PageInputs {
  list: OperatorListLike;
  text: PageTextItems;
  fontNames: Record<string, string>;
}

export const PDFJS_OPS: OpsTable = OPS;

/**
 * Runs pdf.js in Node over every page: operator list (annotations included,
 * as the worker sees them), positioned text, and loaded font names.
 */
export async function loadPageInputs(bytes: Uint8Array): Promise<PageInputs[]> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const out: PageInputs[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const list = await page.getOperatorList();
      const text = textItemsFrom(
        await page.getTextContent({ includeMarkedContent: false }),
      );
      const fontNames: Record<string, string> = {};
      for (const id of Object.keys(text.styles)) {
        const font: unknown = page.commonObjs.has(id)
          ? page.commonObjs.get(id)
          : null;
        fontNames[id] =
          font && typeof font === 'object' && 'name' in font
            ? String(font.name)
            : text.styles[id].fontFamily;
      }
      out.push({ list, text, fontNames });
    }
    return out;
  } finally {
    await task.destroy();
  }
}

/** A one-page PDF whose content stream is `content` verbatim. */
export async function makeRawContentPdf(
  content: string,
  resources?: Record<string, unknown>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const stream = doc.context.stream(content);
  page.node.set(PDFName.of('Contents'), doc.context.register(stream));
  if (resources) {
    const res = page.node.Resources();
    for (const [k, v] of Object.entries(resources))
      res?.set(PDFName.of(k), doc.context.obj(v as never));
  }
  return doc.save();
}

/** One page with `segments` tiny stroked line segments (one path op each). */
export async function makeComplexPagePdf(
  segments = 25_000,
): Promise<Uint8Array> {
  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    const x = 20 + (i % 500);
    const y = 20 + Math.floor(i / 500) * 10;
    parts.push(`${x} ${y} m ${x + 0.5} ${y} l S`);
  }
  return makeRawContentPdf(parts.join('\n'));
}

// ---------------------------------------------------------------------------
// Flat-form fixtures (spec 8.7). Truth rects come from the layout constants.

export interface TruthField {
  /** Page index within the document. */
  page: number;
  rect: Box;
  type: FieldType;
  label: string | null;
  prechecked?: boolean;
}
export interface FlatFormFixture {
  bytes: Uint8Array;
  truth: TruthField[];
}

type Style = 'thin-fill' | 'stroke';
type Rect = { x: number; y: number; w: number; h: number };

const SIZE = 12;
/** Helvetica metrics as pdf.js reports them. */
const ASCENT = 0.718;
const DESCENT = -0.207;
const LINE_H = (ASCENT - DESCENT) * SIZE;
const PAD = 4;
const ROW = 22;
const TOP = 740;
const X0 = 56;
const XL = 216;
const XR = 556;
const black = rgb(0, 0, 0);

interface Ctx {
  page: PDFPage;
  style: Style;
  font: PDFFont;
  bold: PDFFont;
}

const centredBaseline = (y: number, h: number) =>
  y + h / 2 - ((ASCENT + DESCENT) / 2) * SIZE;
const inset = (c: Rect, d: number): Box => ({
  x: c.x + d,
  y: c.y + d,
  width: c.w - 2 * d,
  height: c.h - 2 * d,
});

function hline(ctx: Ctx, x1: number, x2: number, y: number) {
  if (ctx.style === 'stroke')
    ctx.page.drawLine({
      start: { x: x1, y },
      end: { x: x2, y },
      thickness: 0.75,
      color: black,
    });
  else
    ctx.page.drawRectangle({
      x: x1 - 0.25,
      y: y - 0.25,
      width: x2 - x1 + 0.5,
      height: 0.5,
      color: black,
    });
}
function vline(ctx: Ctx, x: number, y1: number, y2: number) {
  if (ctx.style === 'stroke')
    ctx.page.drawLine({
      start: { x, y: y1 },
      end: { x, y: y2 },
      thickness: 0.75,
      color: black,
    });
  else
    ctx.page.drawRectangle({
      x: x - 0.25,
      y: y1 - 0.25,
      width: 0.5,
      height: y2 - y1 + 0.5,
      color: black,
    });
}
/** Every cell's four edges; shared edges are drawn twice, as exporters do. */
function drawCells(ctx: Ctx, cells: Rect[]) {
  for (const c of cells) {
    hline(ctx, c.x, c.x + c.w, c.y);
    hline(ctx, c.x, c.x + c.w, c.y + c.h);
    vline(ctx, c.x, c.y, c.y + c.h);
    vline(ctx, c.x + c.w, c.y, c.y + c.h);
  }
}
function label(ctx: Ctx, str: string, c: Rect, font = ctx.font) {
  const y = c.h > 2 * ROW ? c.y + c.h - ROW : c.y;
  ctx.page.drawText(str, {
    x: c.x + PAD,
    y: centredBaseline(y, ROW),
    size: SIZE,
    font,
  });
}

const APPLICANT_ROWS: [string, number, FieldType][] = [
  ['Surname', 1, 'text'],
  ['Forename(s)', 1, 'text'],
  ['Date of birth', 1, 'date'],
  ['Address', 3, 'text'],
  ['Town', 1, 'text'],
  ['Postcode', 1, 'text'],
  ['Email', 1, 'text'],
  ['Telephone', 1, 'text'],
];

/** Page 1 (and 6): header row over two columns, label cells left, empty cells right. */
function applicantTable(ctx: Ctx, page: number): TruthField[] {
  const header = { x: X0, y: TOP - ROW, w: XR - X0, h: ROW };
  const cells: Rect[] = [header];
  label(ctx, 'Applicant details', header, ctx.bold);
  const truth: TruthField[] = [];
  let y = TOP - ROW;
  for (const [text, rows, type] of APPLICANT_ROWS) {
    const left = { x: X0, y: y - rows * ROW, w: XL - X0, h: rows * ROW };
    cells.push(left);
    label(ctx, text, left);
    for (let r = 0; r < rows; r++) {
      const right = { x: XL, y: y - (r + 1) * ROW, w: XR - XL, h: ROW };
      cells.push(right);
      truth.push({ page, rect: inset(right, 1.5), type, label: text });
    }
    y -= rows * ROW;
  }
  drawCells(ctx, cells);
  return truth;
}

/** Page 2: four columns with a header row, four empty rows and a merged notes row. */
function relativesTable(ctx: Ctx, page: number): TruthField[] {
  const heads: [string, FieldType][] = [
    ['Name', 'text'],
    ['Relationship', 'text'],
    ['Date of birth', 'date'],
    ['Phone', 'text'],
  ];
  const w = (XR - X0) / 4;
  const cells: Rect[] = [];
  const truth: TruthField[] = [];
  heads.forEach(([text], i) => {
    const c = { x: X0 + i * w, y: TOP - ROW, w, h: ROW };
    cells.push(c);
    label(ctx, text, c, ctx.bold);
  });
  for (let r = 1; r <= 4; r++)
    heads.forEach(([text, type], i) => {
      const c = { x: X0 + i * w, y: TOP - (r + 1) * ROW, w, h: ROW };
      cells.push(c);
      truth.push({ page, rect: inset(c, 1.5), type, label: text });
    });
  const notesY = TOP - 6 * ROW;
  const notes = { x: X0, y: notesY, w, h: ROW };
  const merged = { x: X0 + w, y: notesY, w: 3 * w, h: ROW };
  cells.push(notes, merged);
  label(ctx, 'Notes', notes);
  truth.push({ page, rect: inset(merged, 1.5), type: 'text', label: 'Notes' });
  drawCells(ctx, cells);
  return truth;
}

/** Page 3: underscore runs, a date placeholder, a dot leader and two ruled lines. */
function linesPage(ctx: Ctx, page: number): TruthField[] {
  const { font } = ctx;
  const truth: TruthField[] = [];
  const x = 72;
  const leader = (
    prefix: string,
    fill: string,
    y: number,
    type: FieldType,
    name: string,
  ) => {
    ctx.page.drawText(prefix + fill, { x, y, size: SIZE, font });
    truth.push({
      page,
      rect: {
        x: x + font.widthOfTextAtSize(prefix, SIZE),
        y: y - 1,
        width: font.widthOfTextAtSize(fill, SIZE),
        height: 1.25 * SIZE,
      },
      type,
      label: name,
    });
  };
  leader('Name: ', '_'.repeat(30), 700, 'text', 'Name');
  leader('Signature: ', '_'.repeat(30), 660, 'signature', 'Signature');
  leader('Date: ', '__/__/____', 620, 'date', 'Date');
  leader('Occupation ', '.'.repeat(40), 580, 'text', 'Occupation');
  for (const [name, y] of [
    ['Nationality', 540],
    ['Country', 500],
  ] as const) {
    ctx.page.drawText(name, { x, y, size: SIZE, font });
    hline(ctx, 160, 400, y - 2);
    truth.push({
      page,
      rect: { x: 160, y: y - 2, width: 240, height: LINE_H },
      type: 'text',
      label: name,
    });
  }
  return truth;
}

interface Symbols {
  font: PDFFont;
  ascent: number;
  descent: number;
}

/** Page 4: vector squares and checkbox glyphs (from code points), labels on the right. */
function checkboxPage(ctx: Ctx, page: number, sym: Symbols): TruthField[] {
  const truth: TruthField[] = [];
  for (const [name, y] of [
    ['Yes', 700],
    ['No', 670],
    ['I agree', 640],
  ] as const) {
    const box = { x: 72, y, w: 10, h: 10 };
    if (ctx.style === 'stroke')
      ctx.page.drawRectangle({
        x: box.x,
        y: box.y,
        width: 10,
        height: 10,
        borderWidth: 0.75,
        borderColor: black,
      });
    else drawCells(ctx, [box]);
    ctx.page.drawText(name, { x: 88, y: y + 1, size: SIZE, font: ctx.font });
    truth.push({ page, rect: inset(box, 1), type: 'tick', label: name });
  }
  for (const [cp, name, y] of [
    [0x2610, 'Option A', 600],
    [0x2612, 'Option B', 570],
  ] as const) {
    const ch = String.fromCodePoint(cp);
    ctx.page.drawText(ch, { x: 72, y, size: SIZE, font: sym.font });
    ctx.page.drawText(name, { x: 88, y, size: SIZE, font: ctx.font });
    const t: TruthField = {
      page,
      rect: {
        x: 72,
        y: y + sym.descent * SIZE,
        width: sym.font.widthOfTextAtSize(ch, SIZE),
        height: (sym.ascent - sym.descent) * SIZE,
      },
      type: 'tick',
      label: name,
    };
    if (cp === 0x2612) t.prechecked = true;
    truth.push(t);
  }
  return truth;
}

/** Page 5: a tall "Details" cell and "Name:" inside a wide cell. */
function detailsPage(ctx: Ctx, page: number): TruthField[] {
  const left = { x: X0, y: TOP - 120, w: XL - X0, h: 120 };
  const right = { x: XL, y: TOP - 120, w: XR - XL, h: 120 };
  const wide = { x: X0, y: 560, w: 400, h: ROW };
  drawCells(ctx, [left, right, wide]);
  label(ctx, 'Details', left);
  label(ctx, 'Name:', wide);
  const end = wide.x + PAD + ctx.font.widthOfTextAtSize('Name:', SIZE);
  return [
    { page, rect: inset(right, 1.5), type: 'multiline', label: 'Details' },
    {
      page,
      rect: {
        x: end + 1.5,
        y: wide.y + 1.5,
        width: wide.x + wide.w - 1.5 - end - 1.5,
        height: wide.h - 3,
      },
      type: 'text',
      label: 'Name',
    },
  ];
}

const resolve = createRequire(import.meta.url).resolve;
const SYMBOLS_WOFF = resolve(
  '@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff',
);

async function makeFlatForm(style: Style): Promise<FlatFormFixture> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const symBytes = new Uint8Array(readFileSync(SYMBOLS_WOFF));
  const metrics = fontkit.create(symBytes);
  const sym: Symbols = {
    font: await doc.embedFont(symBytes, { subset: true }),
    ascent: metrics.ascent / metrics.unitsPerEm,
    descent: metrics.descent / metrics.unitsPerEm,
  };
  const ctxFor = (page: PDFPage): Ctx => ({ page, style, font, bold });
  const add = () => doc.addPage([612, 792]);
  const truth = [
    ...applicantTable(ctxFor(add()), 0),
    ...relativesTable(ctxFor(add()), 1),
    ...linesPage(ctxFor(add()), 2),
    ...checkboxPage(ctxFor(add()), 3, sym),
    ...detailsPage(ctxFor(add()), 4),
  ];
  const rotated = add();
  rotated.setRotation(degrees(90));
  truth.push(...applicantTable(ctxFor(rotated), 5));
  doc.setTitle(`Flat form (${style})`);
  return { bytes: await doc.save(), truth };
}

/** Six pages, Word-like: table borders are 0.5pt filled rectangles. */
export const makeFlatFormWord = () => makeFlatForm('thin-fill');
/** The same layout drawn with stroked lines (LibreOffice style). */
export const makeFlatFormStroked = () => makeFlatForm('stroke');

const PROSE =
  'This report summarises the quarterly results across all regions. Revenue grew in every region, ' +
  'led by the north, while costs stayed flat. The tables below list the figures by quarter, and the ' +
  'notes that follow explain the main movements and the outlook for the next period.';

/** Prose, a title rule and a fully filled data table: not a form. */
export async function makeNegativeReport(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  const ctx: Ctx = { page, style: 'thin-fill', font, bold };
  page.drawText('Quarterly report', { x: 56, y: 740, size: 18, font: bold });
  hline(ctx, 56, 556, 734);
  const words = PROSE.split(' ');
  let y = 710;
  const paragraph = () => {
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, 11) > 500) {
        page.drawText(line, { x: 56, y, size: 11, font });
        y -= 15;
        line = w;
      } else line = next;
    }
    page.drawText(line, { x: 56, y, size: 11, font });
    y -= 26;
  };
  paragraph();
  paragraph();
  const rows = [
    ['Region', 'Q1', 'Q2', 'Total'],
    ['North', '1,200', '1,350', '2,550'],
    ['South', '980', '1,010', '1,990'],
    ['East', '1,105', '1,240', '2,345'],
    ['West', '870', '920', '1,790'],
  ];
  const w = 500 / 4;
  const cells: Rect[] = [];
  rows.forEach((row, r) =>
    row.forEach((text, i) => {
      const c = { x: 56 + i * w, y: y - (r + 1) * ROW, w, h: ROW };
      cells.push(c);
      label(ctx, text, c, r === 0 ? bold : font);
    }),
  );
  drawCells(ctx, cells);
  y -= rows.length * ROW + 30;
  paragraph();
  return doc.save();
}

/** Half AcroForm widgets over drawn cells, half drawn cells only; truth is the drawn half. */
export async function makeMixedAcroform(): Promise<FlatFormFixture> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  const ctx: Ctx = { page, style: 'thin-fill', font, bold: font };
  const form = doc.getForm();
  const names = ['Surname', 'First name', 'Email', 'Telephone'];
  const drawn = ['Town', 'County', 'Postcode', 'Country'];
  const cells: Rect[] = [];
  const truth: TruthField[] = [];
  [...names, ...drawn].forEach((text, r) => {
    const left = { x: X0, y: TOP - (r + 1) * ROW, w: XL - X0, h: ROW };
    const right = { ...left, x: XL, w: XR - XL };
    cells.push(left, right);
    label(ctx, text, left);
    const rect = inset(right, 1.5);
    if (r < names.length)
      form
        .createTextField(`field_${r}`)
        .addToPage(page, { ...rect, borderWidth: 0 });
    else truth.push({ page: 0, rect, type: 'text', label: text });
  });
  drawCells(ctx, cells);
  return { bytes: await doc.save(), truth };
}

const STANDARD_FONTS = resolve('pdfjs-dist/package.json').replace(
  /package\.json$/,
  'standard_fonts/',
);

/** Image-only render of the flat form's first page (input for P5-F raster detection and OCR). */
export async function makeScanForm(): Promise<Uint8Array> {
  const { bytes } = await makeFlatFormWord();
  const task = getDocument({
    data: bytes,
    verbosity: 0,
    standardFontDataUrl: STANDARD_FONTS,
  });
  let rgba: Uint8Array;
  let width: number;
  let height: number;
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 150 / 72 });
    width = Math.ceil(viewport.width);
    height = Math.ceil(viewport.height);
    // pdf.js types the factory loosely; in Node it is backed by @napi-rs/canvas.
    const factory = pdf.canvasFactory as {
      create(
        w: number,
        h: number,
      ): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D };
    };
    const { canvas, context } = factory.create(width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    rgba = new Uint8Array(context.getImageData(0, 0, width, height).data);
  } finally {
    await task.destroy();
  }
  const doc = await PDFDocument.create();
  const image = await doc.embedJpg(encodeJpeg(width, height, rgba, 85));
  doc
    .addPage([612, 792])
    .drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
  return doc.save();
}
