import type { Box } from '@/pdf/doc/types';

export type AlignHow =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';

/**
 * Aligns two or more boxes (page space, y up) to the selection's bounds:
 * left/right/top/bottom edges, or the horizontal centre / vertical middle.
 * Returns the boxes in input order; sizes are unchanged.
 */
export function alignBoxes(boxes: readonly Box[], how: AlignHow): Box[] {
  if (boxes.length < 2) return boxes.map((b) => ({ ...b }));
  const left = Math.min(...boxes.map((b) => b.x));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.min(...boxes.map((b) => b.y));
  const top = Math.max(...boxes.map((b) => b.y + b.height));
  return boxes.map((b) => {
    switch (how) {
      case 'left':
        return { ...b, x: left };
      case 'right':
        return { ...b, x: right - b.width };
      case 'center':
        return { ...b, x: (left + right) / 2 - b.width / 2 };
      case 'top':
        return { ...b, y: top - b.height };
      case 'bottom':
        return { ...b, y: bottom };
      case 'middle':
        return { ...b, y: (bottom + top) / 2 - b.height / 2 };
    }
  });
}

/**
 * Spaces three or more boxes with equal gaps between them along an axis,
 * keeping the outermost two where they are. Input order is kept.
 */
export function distributeBoxes(
  boxes: readonly Box[],
  axis: 'horizontal' | 'vertical',
): Box[] {
  if (boxes.length < 3) return boxes.map((b) => ({ ...b }));
  const key = axis === 'horizontal' ? 'x' : 'y';
  const size = axis === 'horizontal' ? 'width' : 'height';
  const order = boxes
    .map((b, i) => ({ b, i }))
    .sort((p, q) => p.b[key] - q.b[key]);
  const first = order[0].b;
  const last = order[order.length - 1].b;
  const span = last[key] + last[size] - first[key];
  const used = order.reduce((s, { b }) => s + b[size], 0);
  const gap = (span - used) / (order.length - 1);
  const out: Box[] = boxes.map((b) => ({ ...b }));
  let at = first[key];
  for (const { b, i } of order) {
    out[i] = { ...b, [key]: at };
    at += b[size] + gap;
  }
  return out;
}
