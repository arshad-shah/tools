import type { SignTarget } from '@/pdf/detect';
import type { Box } from '@/pdf/doc/types';

/** Left padding on lines and leaders, inset in cells (points). */
const LINE_PAD = 4;
const CELL_INSET = 2;
const MIN_H = 18;
const MAX_H = 48;
/** Share of the height below the line, for descenders. */
const DESCENT = 0.15;
/** Room assumed above a line whose detection gave none. */
export const DEFAULT_LINE_GAP = 30;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/**
 * A signature box (aspect = width / height) on a target (plan H-8). Lines
 * and leaders: 0.9 x the line gap tall, clamped to 18..48pt, no wider than
 * the line, left aligned 4pt in, its baseline on the line (15% of the
 * height below it). Cells: as large as fits inside a 2pt inset, centred.
 * /Sig fields: the field's rect.
 */
export function snapToTarget(
  content: { aspect: number },
  target: SignTarget,
  lineGap: number,
): Box {
  const { rect } = target;
  const { aspect } = content;
  if (target.source === 'sig-field') return { ...rect };
  if (target.source === 'cell') {
    const inner = {
      x: rect.x + CELL_INSET,
      y: rect.y + CELL_INSET,
      width: rect.width - 2 * CELL_INSET,
      height: rect.height - 2 * CELL_INSET,
    };
    const width = Math.min(inner.width, inner.height * aspect);
    const height = width / aspect;
    return {
      x: inner.x + (inner.width - width) / 2,
      y: inner.y + (inner.height - height) / 2,
      width,
      height,
    };
  }
  const tall = clamp(0.9 * lineGap, MIN_H, MAX_H);
  const width = Math.min(tall * aspect, Math.max(1, rect.width - LINE_PAD));
  const height = width / aspect;
  return {
    x: rect.x + LINE_PAD,
    y: rect.y - DESCENT * height,
    width,
    height,
  };
}

/** Distance from a point to a box (0 inside). */
function distance(b: Box, [x, y]: [number, number]): number {
  const dx = Math.max(b.x - x, 0, x - (b.x + b.width));
  const dy = Math.max(b.y - y, 0, y - (b.y + b.height));
  return Math.hypot(dx, dy);
}

/** The target on `pageIndex` closest to `point`, if one is within `within` points. */
export function nearestTarget(
  targets: readonly SignTarget[],
  point: [number, number],
  pageIndex: number,
  within = 12,
): SignTarget | null {
  let best: SignTarget | null = null;
  let bestD = within;
  for (const t of targets) {
    if (t.pageIndex !== pageIndex) continue;
    const d = distance(t.rect, point);
    if (d <= bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/** The point of a signature box that snaps: its centre on the baseline. */
export const snapPoint = (b: Box): [number, number] => [
  b.x + b.width / 2,
  b.y + DESCENT * b.height,
];
