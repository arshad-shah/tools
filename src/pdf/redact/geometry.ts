import type { Box } from '@/pdf/doc/types';

export { quadBox } from '@/pdf/edit/content/matrix';

const inside = (x: number, y: number, m: Box) =>
  x >= m.x && x <= m.x + m.width && y >= m.y && y <= m.y + m.height;

/** Intersection area / glyph area; a degenerate glyph counts 1 when it touches the mark. */
export function overlapFraction(glyph: Box, mark: Box): number {
  const w =
    Math.min(glyph.x + glyph.width, mark.x + mark.width) -
    Math.max(glyph.x, mark.x);
  const h =
    Math.min(glyph.y + glyph.height, mark.y + mark.height) -
    Math.max(glyph.y, mark.y);
  if (w < 0 || h < 0) return 0;
  const area = glyph.width * glyph.height;
  if (area <= 0) return 1;
  return (w * h) / area;
}

/**
 * True when `box` lies inside the union of `marks`, sampled on a 4x4 grid
 * plus the corners (conservative: a sample outside every mark keeps it).
 */
export function coveredBy(box: Box, marks: readonly Box[]): boolean {
  for (let i = 0; i <= 4; i++)
    for (let j = 0; j <= 4; j++) {
      const x = box.x + (box.width * i) / 4;
      const y = box.y + (box.height * j) / 4;
      if (!marks.some((m) => inside(x, y, m))) return false;
    }
  return true;
}

export const intersects = (a: Box, b: Box) =>
  a.x <= b.x + b.width &&
  b.x <= a.x + a.width &&
  a.y <= b.y + b.height &&
  b.y <= a.y + a.height;
