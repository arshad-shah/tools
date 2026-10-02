import { readFileSync } from 'node:fs';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, StandardFonts, type PDFPage } from 'pdf-lib';
import type { TruthField } from './flat-form';
import {
  baseline,
  drawCells,
  heading,
  labelledRows,
  PAD,
  piece,
  SIZE,
  SYMBOLS_WOFF,
  text,
  TOP,
  X0,
  X1,
  yesNo,
  type Ctx,
  type Rect,
} from './word-table-form';

/*
 * The owner's real EUTR5 page 7 in miniature: a Word-exported form (no
 * AcroForm) whose answers are one box per character. Each box is a table
 * cell drawn with thin filled-rectangle borders, so every box is a closed
 * cell; detection must group a run of boxes into one comb text field. Page
 * 1 carries the decoys that gave false positives: a shaded title band with
 * white text, an empty coloured bar and a rule under it, and a header
 * rectangle holding a heading. Truth rects of comb fields span the boxes
 * horizontally and are inset 1.5pt vertically.
 */

export interface CharBoxTruth extends TruthField {
  /** Comb fields: the number of character cells. */
  cellCount?: number;
}

const BOX = 14;
const BOX_H = 18;
const LABEL_W = 140;
const BX = X0 + LABEL_W;
const ROW_GAP = 6;
const white = rgb(1, 1, 1);
const teal = rgb(0.05, 0.33, 0.4);

/** b: a box; g: an unbordered gap one box wide (with optional text). */
type Slot = 'b' | { gap: string };

/**
 * A label cell, then the slots left to right from BX. Returns the comb
 * truths: one per run of boxes split at gaps wider than one box, or one
 * date field when `date` is set (the gaps are its separators).
 */
function boxRow(
  ctx: Ctx,
  page: number,
  top: number,
  label: string,
  slots: Slot[],
  opts: {
    date?: boolean;
    printed?: string;
    labelOf?: (run: number) => string | null;
  } = {},
): { truth: CharBoxTruth[]; bottom: number } {
  const y = top - BOX_H;
  const labelCell = { x: X0, y, w: LABEL_W, h: BOX_H };
  drawCells(ctx, [labelCell]);
  text(ctx, label, labelCell);
  const boxes: Rect[] = [];
  const runs: Rect[][] = [];
  let run: Rect[] = [];
  let gapRun = 0;
  slots.forEach((s, i) => {
    const x = BX + i * BOX;
    if (s === 'b') {
      if (gapRun > 1 && run.length) {
        runs.push(run);
        run = [];
      }
      gapRun = 0;
      const b = { x, y, w: BOX, h: BOX_H };
      boxes.push(b);
      run.push(b);
      return;
    }
    gapRun++;
    if (s.gap)
      ctx.page.drawText(s.gap, {
        x: x + BOX / 2 - ctx.font.widthOfTextAtSize(s.gap, SIZE) / 2,
        y: baseline({ x, y, w: BOX, h: BOX_H }),
        size: SIZE,
        font: ctx.font,
      });
  });
  if (run.length) runs.push(run);
  drawCells(ctx, boxes);
  if (opts.printed)
    Array.from(opts.printed).forEach((ch, i) =>
      ctx.page.drawText(ch, {
        x: boxes[i].x + 3.5,
        y: baseline(boxes[i]),
        size: SIZE,
        font: ctx.font,
      }),
    );
  if (opts.printed) return { truth: [], bottom: y };
  const span = (r: Rect[]) => ({
    x: r[0].x,
    y: y + 1.5,
    width: r[r.length - 1].x + BOX - r[0].x,
    height: BOX_H - 3,
  });
  const truth: CharBoxTruth[] = opts.date
    ? [
        {
          page,
          rect: span(boxes),
          type: 'date',
          label,
          cellCount: 10,
        },
      ]
    : runs.map((r, k) => ({
        page,
        rect: span(r),
        type: 'text' as const,
        label: opts.labelOf ? opts.labelOf(k) : label,
        cellCount: r.length,
      }));
  return { truth, bottom: y };
}

const boxes = (n: number): Slot[] => Array.from({ length: n }, () => 'b');
const gaps = (n: number, t = ''): Slot[] =>
  Array.from({ length: n }, () => ({ gap: t }));

/** A filled band (Word cell shading), optionally bordered, with white text. */
function band(ctx: Ctx, r: Rect, title: string | null, size = 16) {
  ctx.page.drawRectangle({
    x: r.x,
    y: r.y,
    width: r.w,
    height: r.h,
    color: teal,
  });
  drawCells(ctx, [r]);
  if (title)
    ctx.page.drawText(title, {
      x: r.x + PAD,
      y: r.y + r.h / 2 - 0.25 * size,
      size,
      font: ctx.bold,
      color: white,
    });
}

/** Page 1: title band, an empty bar and a rule under it, a header box, then a short table. */
function titlePage(ctx: Ctx, page: number): CharBoxTruth[] {
  band(ctx, { x: X0, y: 790, w: X1 - X0, h: 30 }, 'Application form EUTR5');
  band(ctx, { x: X0, y: 776, w: X1 - X0, h: 10 }, null);
  piece(ctx, X0, 771, X1 - X0, 0.75);
  // A header rectangle (stroked) holding a heading and nothing to fill.
  ctx.page.drawRectangle({
    x: X0,
    y: 720,
    width: X1 - X0,
    height: 40,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.75,
  });
  ctx.page.drawText('Part A: About you', {
    x: X0 + PAD,
    y: 735,
    size: 14,
    font: ctx.bold,
  });
  const rows = labelledRows(ctx, page, 700, [
    { label: 'Full name', type: 'text' },
    { label: 'Email address', type: 'text' },
    { label: 'Telephone number', type: 'text' },
  ]);
  const q = yesNo(ctx, page, rows.bottom - 20, 'Have you applied before?');
  return [...rows.truth, ...q.truth];
}

/** The character-box page: comb rows, a date, a split run, printed boxes, Yes/No and a declaration. */
function boxesPage(ctx: Ctx, page: number): CharBoxTruth[] {
  heading(ctx, 'Section 2: Your details (one letter per box)', TOP);
  const truth: CharBoxTruth[] = [];
  let top = TOP - 14;
  const row = (
    label: string,
    slots: Slot[],
    opts?: Parameters<typeof boxRow>[5],
  ) => {
    const r = boxRow(ctx, page, top, label, slots, opts);
    truth.push(...r.truth);
    top = r.bottom - ROW_GAP;
  };
  for (const label of [
    'Surname',
    'Forename(s)',
    'Previous surname(s)',
    'Address line 1',
    'Address line 2',
    'Town',
  ])
    row(label, boxes(24));
  row('Postcode', boxes(8));
  row(
    'Date of birth',
    [...boxes(2), ...gaps(1, '/'), ...boxes(2), ...gaps(1, '/'), ...boxes(4)],
    { date: true },
  );
  // Area code and number: the two-box gap splits the run.
  row('Telephone', [...boxes(5), ...gaps(2), ...boxes(6)], {
    labelOf: (k) => (k === 0 ? 'Telephone' : null),
  });
  row('Nationality', boxes(24));
  // Pre-printed reference boxes: text in every box, nothing to fill.
  row('Office code', boxes(6), { printed: 'EUTR57' });
  const q = yesNo(ctx, page, top - 4, 'Do you hold another nationality?');
  truth.push(...q.truth);
  band(ctx, { x: X0, y: q.bottom - 34, w: X1 - X0, h: 20 }, 'Declaration', 12);
  truth.push(
    ...labelledRows(ctx, page, q.bottom - 40, [
      { label: 'Signature', type: 'signature', h: 36 },
      { label: 'Date', type: 'date' },
    ]).truth,
  );
  return truth;
}

/**
 * `pages` pages (default 2): the title page, then character-box pages (the
 * real form has 37 pages).
 */
export async function makeCharBoxForm(pages = 2): Promise<{
  bytes: Uint8Array;
  truth: CharBoxTruth[];
}> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const symBytes = new Uint8Array(readFileSync(SYMBOLS_WOFF));
  const has = fontkit.create(symBytes).hasGlyphForCodePoint(0x2713);
  const sym = has ? await doc.embedFont(symBytes, { subset: true }) : null;
  let seed = 11;
  const jitter = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return (seed / 233280 - 0.5) * 0.6;
  };
  const ctxFor = (page: PDFPage): Ctx => ({ page, font, bold, sym, jitter });
  const add = () => doc.addPage([595.28, 841.89]);
  const truth: CharBoxTruth[] = [...titlePage(ctxFor(add()), 0)];
  for (let p = 1; p < pages; p++) truth.push(...boxesPage(ctxFor(add()), p));
  doc.setTitle('Character box form');
  return { bytes: await doc.save(), truth };
}
