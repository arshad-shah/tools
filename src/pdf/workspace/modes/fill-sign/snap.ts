import type { Box } from '@/pdf/doc/types';

/** Default click-anywhere text size and box (spec §8.5). */
export const CLICK_TEXT_SIZE = 11;
export const CLICK_BOX_WIDTH = 160;
export const MARK_SIZE = 10;

const inside = (b: Box, x: number, y: number) =>
  x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;

/**
 * Where click-anywhere text goes (spec §8.5): inside a table cell (any cell,
 * label cells included) the box is the cell left-padded 3pt with its bottom
 * at the cell's baseline (cell bottom + a quarter of its height, capped to
 * the font size); elsewhere a 160pt box sitting on the click's baseline.
 */
export function snapToCell(
  point: { x: number; y: number },
  cells: readonly Box[],
  size = CLICK_TEXT_SIZE,
): { box: Box; cell: Box | null } {
  const cell =
    cells
      .filter((c) => inside(c, point.x, point.y))
      .sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? null;
  const height = 1.25 * size;
  if (!cell)
    return {
      box: { x: point.x, y: point.y, width: CLICK_BOX_WIDTH, height },
      cell: null,
    };
  const baseline = cell.y + Math.min(cell.height / 4, size);
  const descent = 0.25 * size;
  const y = Math.max(cell.y, baseline - descent);
  return {
    box: {
      x: cell.x + 3,
      y,
      width: Math.max(1, cell.width - 6),
      height: Math.min(cell.y + cell.height - y, height),
    },
    cell,
  };
}

/** A square tick or cross box centred on the point (spec §8.5). */
export const markBox = (point: { x: number; y: number }): Box => ({
  x: point.x - MARK_SIZE / 2,
  y: point.y - MARK_SIZE / 2,
  width: MARK_SIZE,
  height: MARK_SIZE,
});

/**
 * A new text box kept on its page: it is narrowed to the room right of
 * where it starts, and only moved left (or down) when even `minWidth`
 * would not fit.
 */
export function clampToPage(box: Box, page: Box, minWidth = 40): Box {
  const right = page.x + page.width;
  const top = page.y + page.height;
  const width = Math.min(
    box.width,
    Math.max(Math.min(minWidth, page.width), right - box.x),
  );
  const height = Math.min(box.height, page.height);
  return {
    x: Math.max(page.x, Math.min(box.x, right - width)),
    y: Math.max(page.y, Math.min(box.y, top - height)),
    width,
    height,
  };
}
