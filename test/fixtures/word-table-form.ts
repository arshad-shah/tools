import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { Box } from '../../src/pdf/doc/types';
import type { TruthField } from './flat-form';

/*
 * A Word-exported government form in the style of the owner's real case
 * (EUTR5): no AcroForm; every blank is a table cell. Borders are many thin
 * filled rectangles (Word splits each border at every column and draws each
 * cell's own edges, slightly offset), never strokes. Label cells sit left
 * of (or above) empty answer cells; Yes/No choices are small empty square
 * cells beside "Yes (give details below)" and "No"; the declaration has
 * Signature and Date cells. Truth rects are the answer cells inset 1.5pt
 * (squares inset 1pt), from the layout constants below.
 */

export const SIZE = 10;
const ASCENT = 0.718;
const DESCENT = -0.207;
export const PAD = 5;
export const ROW = 24;
export const X0 = 56;
export const XM = 276;
export const X1 = 539;
export const TOP = 780;
const SQ = 14;
const black = rgb(0, 0, 0);

export type Rect = { x: number; y: number; w: number; h: number };

const resolve = createRequire(import.meta.url).resolve;
export const SYMBOLS_WOFF = resolve(
  '@fontsource/noto-sans-symbols-2/files/noto-sans-symbols-2-symbols-400-normal.woff',
);

export interface Ctx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  sym: PDFFont | null;
  /** Deterministic sub-point offsets, as Word's layout rounding leaves them. */
  jitter(): number;
}

export const inset = (c: Rect, d: number): Box => ({
  x: c.x + d,
  y: c.y + d,
  width: c.w - 2 * d,
  height: c.h - 2 * d,
});
export const baseline = (c: Rect) =>
  c.y + c.h / 2 - ((ASCENT + DESCENT) / 2) * SIZE;

/** One 0.48pt border piece as a filled rectangle (one path op each). */
export function piece(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.page.drawRectangle({ x, y, width: w, height: h, color: black });
}

/**
 * Each cell draws its own four edges, every edge split in two pieces (as
 * Word does at column and row joins), each slightly offset.
 */
export function drawCells(ctx: Ctx, cells: Rect[]) {
  const t = 0.48;
  for (const c of cells) {
    for (const y of [c.y, c.y + c.h]) {
      const mid = c.x + c.w / 2;
      piece(ctx, c.x - t / 2 + ctx.jitter(), y - t / 2, mid - c.x + 0.3, t);
      piece(ctx, mid, y - t / 2 + ctx.jitter() / 3, c.x + c.w - mid + t / 2, t);
    }
    for (const x of [c.x, c.x + c.w]) {
      const mid = c.y + c.h / 2;
      piece(ctx, x - t / 2, c.y - t / 2 + ctx.jitter(), t, mid - c.y + 0.3);
      piece(ctx, x - t / 2 + ctx.jitter() / 3, mid, t, c.y + c.h - mid + t / 2);
    }
  }
}

export function text(ctx: Ctx, str: string, c: Rect, font = ctx.font) {
  ctx.page.drawText(str, {
    x: c.x + PAD,
    y: c.h > 2 * ROW ? c.y + c.h - ROW + 8 : baseline(c),
    size: SIZE,
    font,
  });
}

/** A label cell left of an empty answer cell, one per row. */
export function labelledRows(
  ctx: Ctx,
  page: number,
  top: number,
  rows: { label: string; type: TruthField['type']; h?: number }[],
): { truth: TruthField[]; bottom: number } {
  const truth: TruthField[] = [];
  let y = top;
  for (const r of rows) {
    const h = r.h ?? ROW;
    y -= h;
    const left = { x: X0, y, w: XM - X0, h };
    const right = { x: XM, y, w: X1 - XM, h };
    drawCells(ctx, [left, right]);
    text(ctx, r.label, left);
    truth.push({ page, rect: inset(right, 1.5), type: r.type, label: r.label });
  }
  return { truth, bottom: y };
}

/** A full-width label cell above a full-width empty answer cell. */
function labelAbove(
  ctx: Ctx,
  page: number,
  top: number,
  label: string,
  h: number,
): { truth: TruthField[]; bottom: number } {
  const head = { x: X0, y: top - 20, w: X1 - X0, h: 20 };
  const body = { x: X0, y: head.y - h, w: X1 - X0, h };
  drawCells(ctx, [head, body]);
  text(ctx, label, head, ctx.bold);
  return {
    truth: [
      {
        page,
        rect: inset(body, 1.5),
        type: h >= 2.2 * (ASCENT - DESCENT) * SIZE ? 'multiline' : 'text',
        label,
      },
    ],
    bottom: body.y,
  };
}

/**
 * A question in a full-width cell (ending in "( tick )" as the real form
 * marks it), then a row of [square][Yes label][square][No label] cells.
 */
export function yesNo(
  ctx: Ctx,
  page: number,
  top: number,
  question: string,
): { truth: TruthField[]; bottom: number } {
  const q = { x: X0, y: top - 30, w: X1 - X0, h: 30 };
  drawCells(ctx, [q]);
  ctx.page.drawText(question, {
    x: q.x + PAD,
    y: baseline(q),
    size: SIZE,
    font: ctx.font,
  });
  if (ctx.sym) {
    const x = q.x + PAD + ctx.font.widthOfTextAtSize(`${question} ( `, SIZE);
    ctx.page.drawText('( ', {
      x: x - ctx.font.widthOfTextAtSize('( ', SIZE),
      y: baseline(q),
      size: SIZE,
      font: ctx.font,
    });
    ctx.page.drawText(String.fromCodePoint(0x2713), {
      x,
      y: baseline(q),
      size: SIZE,
      font: ctx.sym,
    });
    ctx.page.drawText(' )', {
      x: x + ctx.sym.widthOfTextAtSize(String.fromCodePoint(0x2713), SIZE),
      y: baseline(q),
      size: SIZE,
      font: ctx.font,
    });
  }
  const y = q.y - SQ;
  const yesBox = { x: X0, y, w: SQ, h: SQ };
  const yesLabel = { x: X0 + SQ, y, w: 200, h: SQ };
  const noBox = { x: X0 + SQ + 200, y, w: SQ, h: SQ };
  const noLabel = {
    x: X0 + 2 * SQ + 200,
    y,
    w: X1 - (X0 + 2 * SQ + 200),
    h: SQ,
  };
  drawCells(ctx, [yesBox, yesLabel, noBox, noLabel]);
  text(ctx, 'Yes (give details below)', yesLabel);
  text(ctx, 'No', noLabel);
  return {
    truth: [
      {
        page,
        rect: inset(yesBox, 1),
        type: 'tick',
        label: 'Yes (give details below)',
      },
      { page, rect: inset(noBox, 1), type: 'tick', label: 'No' },
    ],
    bottom: y,
  };
}

export function heading(ctx: Ctx, str: string, y: number) {
  ctx.page.drawText(str, { x: X0, y, size: 12, font: ctx.bold });
}

/** Section 1: personal details (label left), and an address (label above). */
function detailsPage(ctx: Ctx, page: number): TruthField[] {
  heading(ctx, 'Section 1: Your details', TOP);
  const a = labelledRows(ctx, page, TOP - 14, [
    { label: 'Name under which you were convicted', type: 'text' },
    { label: 'Country where you were convicted', type: 'text' },
    { label: 'Date sentenced', type: 'date' },
    { label: 'Term of imprisonment, if any, in months', type: 'text' },
  ]);
  const b = labelAbove(ctx, page, a.bottom - 20, 'Address', 48);
  return [...a.truth, ...b.truth];
}

/** Section 2: Yes/No questions with a details cell after each. */
function questionsPage(ctx: Ctx, page: number, n: number): TruthField[] {
  heading(ctx, `Section ${n}: Previous convictions`, TOP);
  const q1 = yesNo(
    ctx,
    page,
    TOP - 14,
    'Have you been convicted of an offence?',
  );
  const d1 = labelAbove(
    ctx,
    page,
    q1.bottom - 10,
    'Details of the offence',
    60,
  );
  const q2 = yesNo(
    ctx,
    page,
    d1.bottom - 20,
    'Are any proceedings pending against you?',
  );
  return [...q1.truth, ...d1.truth, ...q2.truth];
}

/** Section 7: the declaration with Signature and Date cells. */
function declarationPage(ctx: Ctx, page: number): TruthField[] {
  heading(ctx, 'Section 7: Declaration', TOP);
  ctx.page.drawText(
    'I declare that the information given in this form is true and complete.',
    { x: X0, y: TOP - 24, size: SIZE, font: ctx.font },
  );
  return labelledRows(ctx, page, TOP - 40, [
    { label: 'Signature', type: 'signature', h: 36 },
    { label: 'Date', type: 'date' },
  ]).truth;
}

/**
 * `pages` pages (default 4): details, two question pages, declaration last;
 * longer forms repeat the middle pages (the real form has 37).
 */
export async function makeWordTableForm(pages = 4): Promise<{
  bytes: Uint8Array;
  truth: TruthField[];
}> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const symBytes = new Uint8Array(readFileSync(SYMBOLS_WOFF));
  const has = fontkit.create(symBytes).hasGlyphForCodePoint(0x2713);
  const sym = has ? await doc.embedFont(symBytes, { subset: true }) : null;
  let seed = 7;
  const jitter = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return (seed / 233280 - 0.5) * 0.6;
  };
  const ctxFor = (page: PDFPage): Ctx => ({ page, font, bold, sym, jitter });
  const add = () => doc.addPage([595.28, 841.89]);
  const truth: TruthField[] = [...detailsPage(ctxFor(add()), 0)];
  for (let p = 1; p < pages - 1; p++)
    truth.push(...questionsPage(ctxFor(add()), p, p + 1));
  truth.push(...declarationPage(ctxFor(add()), pages - 1));
  doc.setTitle('Word table form');
  return { bytes: await doc.save(), truth };
}
