/*
 * Pure annotation geometry shared by the writers and the workspace overlay
 * (no pdf-lib), so previews draw exactly what the appearance streams draw.
 */
export type Point = [number, number];

/** Arrowhead length for a line width. */
export const arrowLength = (width: number) => 3 * width + 6;

/** The two arrowhead barbs at `to`, each 30 degrees off the line. */
export function arrowBarbs(
  from: Point,
  to: Point,
  width: number,
): [Point, Point] {
  const len = arrowLength(width);
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const barb = (d: number): Point => [
    to[0] - len * Math.cos(angle + d),
    to[1] - len * Math.sin(angle + d),
  ];
  return [barb(Math.PI / 6), barb(-Math.PI / 6)];
}

/** Stroke width of underline, strikeout and squiggly for a quad of height h. */
export const markupStroke = (h: number) => Math.max(0.5, h / 14);

/** Inner padding of a free-text comment, points. */
export const FREETEXT_PAD = 2;
export const FREETEXT_LINE_HEIGHT = 1.2;

/** Stamp border width and the label box inside it. */
export const STAMP_BORDER = 2;
export function stampTextBox(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const pad = STAMP_BORDER + 4;
  return {
    x: rect.x + pad,
    y: rect.y + pad,
    width: Math.max(0, rect.width - 2 * pad),
    height: Math.max(0, rect.height - 2 * pad),
  };
}

/** Note icon size, points. */
export const NOTE_SIZE = 20;

/** A darker shade of '#rrggbb' (the note icon outline). */
export function darker(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const to = (v: number) =>
    Math.round(v * 0.55)
      .toString(16)
      .padStart(2, '0');
  return `#${to((n >> 16) & 255)}${to((n >> 8) & 255)}${to(n & 255)}`;
}
