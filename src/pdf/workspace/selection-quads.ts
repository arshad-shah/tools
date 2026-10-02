import { toPage, type Viewport } from '@/pdf/doc/geometry';
import type { Box } from '@/pdf/doc/types';

/** UL, UR, LL, LR corners (PDF QuadPoints order), page space. */
export type Quad = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Page-space box covering a page-slot-relative screen rect. */
function toPageBox(vp: Viewport, r: Rect): Box {
  const pts = [
    toPage(vp, r.left, r.top),
    toPage(vp, r.left + r.width, r.top),
    toPage(vp, r.left, r.top + r.height),
    toPage(vp, r.left + r.width, r.top + r.height),
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

const quadOf = (b: Box): Quad => [
  b.x,
  b.y + b.height,
  b.x + b.width,
  b.y + b.height,
  b.x,
  b.y,
  b.x + b.width,
  b.y,
];

/**
 * A text selection's client rects as one quad per line, page space: rects
 * on one line (same top within 2px, gap under 4px, measured on screen) are
 * merged, then mapped through the page viewport. Quads are axis-aligned in
 * page space, so they follow text drawn upright in page space whatever the
 * page's rotation.
 */
export function selectionQuads(
  rects: readonly DOMRect[],
  pageRect: DOMRect,
  vp: Viewport,
): Quad[] {
  const rel: Rect[] = rects
    .filter((r) => r.width > 0.5 && r.height > 0.5)
    .map((r) => ({
      left: r.left - pageRect.left,
      top: r.top - pageRect.top,
      width: r.width,
      height: r.height,
    }));
  // Text runs along screen x when the page shows upright (0/180), along y otherwise.
  const [a, b] = vp.transform;
  const vertical = Math.abs(a) < Math.abs(b);
  const along = (r: Rect) =>
    vertical
      ? { start: r.top, end: r.top + r.height, cross: r.left, size: r.width }
      : { start: r.left, end: r.left + r.width, cross: r.top, size: r.height };
  const sorted = [...rel].sort(
    (p, q) =>
      along(p).cross - along(q).cross || along(p).start - along(q).start,
  );
  const merged: Rect[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last) {
      const l = along(last);
      const n = along(r);
      if (Math.abs(l.cross - n.cross) <= 2 && n.start - l.end < 4) {
        const left = Math.min(last.left, r.left);
        const top = Math.min(last.top, r.top);
        merged[merged.length - 1] = {
          left,
          top,
          width: Math.max(last.left + last.width, r.left + r.width) - left,
          height: Math.max(last.top + last.height, r.top + r.height) - top,
        };
        continue;
      }
    }
    merged.push(r);
  }
  return merged.map((r) => quadOf(toPageBox(vp, r)));
}
