import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Box } from '../../src/pdf/doc/types';
import type { FieldType } from '../../src/pdf/detect/types';
import type { TruthField } from './flat-form';

/*
 * The flat-form fixture's layout and page builders (spec 8.7): each builder
 * draws one page and returns its truth fields. flat-form.ts assembles the
 * documents.
 */

export type Style = 'thin-fill' | 'stroke';
export type Rect = { x: number; y: number; w: number; h: number };

export const SIZE = 12;
/** Helvetica metrics as pdf.js reports them. */
export const ASCENT = 0.718;
export const DESCENT = -0.207;
export const LINE_H = (ASCENT - DESCENT) * SIZE;
export const PAD = 4;
export const ROW = 22;
export const TOP = 740;
export const X0 = 56;
export const XL = 216;
export const XR = 556;
export const black = rgb(0, 0, 0);

export interface Ctx {
  page: PDFPage;
  style: Style;
  font: PDFFont;
  bold: PDFFont;
}

export const centredBaseline = (y: number, h: number) =>
  y + h / 2 - ((ASCENT + DESCENT) / 2) * SIZE;
export const inset = (c: Rect, d: number): Box => ({
  x: c.x + d,
  y: c.y + d,
  width: c.w - 2 * d,
  height: c.h - 2 * d,
});

export function hline(ctx: Ctx, x1: number, x2: number, y: number) {
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
export function vline(ctx: Ctx, x: number, y1: number, y2: number) {
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
export function drawCells(ctx: Ctx, cells: Rect[]) {
  for (const c of cells) {
    hline(ctx, c.x, c.x + c.w, c.y);
    hline(ctx, c.x, c.x + c.w, c.y + c.h);
    vline(ctx, c.x, c.y, c.y + c.h);
    vline(ctx, c.x + c.w, c.y, c.y + c.h);
  }
}
export function label(ctx: Ctx, str: string, c: Rect, font = ctx.font) {
  const y = c.h > 2 * ROW ? c.y + c.h - ROW : c.y;
  ctx.page.drawText(str, {
    x: c.x + PAD,
    y: centredBaseline(y, ROW),
    size: SIZE,
    font,
  });
}

export const APPLICANT_ROWS: [string, number, FieldType][] = [
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
export function applicantTable(ctx: Ctx, page: number): TruthField[] {
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
export function relativesTable(ctx: Ctx, page: number): TruthField[] {
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
export function linesPage(ctx: Ctx, page: number): TruthField[] {
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

export interface Symbols {
  font: PDFFont;
  ascent: number;
  descent: number;
}

/** Page 4: vector squares and checkbox glyphs (from code points), labels on the right. */
export function checkboxPage(
  ctx: Ctx,
  page: number,
  sym: Symbols,
): TruthField[] {
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
export function detailsPage(ctx: Ctx, page: number): TruthField[] {
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
