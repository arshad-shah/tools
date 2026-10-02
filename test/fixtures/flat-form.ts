import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import {
  degrees,
  PDFDocument,
  PDFName,
  StandardFonts,
  type PDFPage,
} from 'pdf-lib';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { textItemsFrom } from '../../src/pdf/render/text';
import { fontAdvancesOf } from '../../src/pdf/render/detect-page';
import type { PageTextItems } from '../../src/pdf/render';
import type { Box } from '../../src/pdf/doc/types';
import type {
  FieldType,
  FontAdvances,
  OperatorListLike,
  OpsTable,
} from '../../src/pdf/detect/types';
import { encodeJpeg } from './images';

/** What the render worker hands `extractGeometry` for one page. */
export interface PageInputs {
  list: OperatorListLike;
  text: PageTextItems;
  fontNames: Record<string, string>;
  /** Per-font advance widths, as the render worker reads them. */
  fonts: Record<string, FontAdvances>;
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
    fontExtraProperties: true,
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
      const fonts = fontAdvancesOf(
        page as unknown as Parameters<typeof fontAdvancesOf>[0],
        Object.keys(text.styles),
      );
      out.push({ list, text, fontNames, fonts });
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

import {
  ROW,
  TOP,
  X0,
  XL,
  XR,
  inset,
  hline,
  drawCells,
  label,
  applicantTable,
  relativesTable,
  linesPage,
  checkboxPage,
  detailsPage,
  type Style,
  type Rect,
  type Ctx,
  type Symbols,
} from './flat-form-pages';

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
