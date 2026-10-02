import type { Box } from '@/pdf/doc/types';

/* Mark colours, free of pdf-lib so the render worker can use them. */

export interface RedactMark {
  box: Box;
  /** #rrggbb */
  fill: string;
  overlayText: string | null;
  /** The matched text of a search mark (verification looks for it). */
  term?: string;
}

export const rgbOf = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** White or black, whichever reads better on `fill`. */
export function textColour(fill: string): [number, number, number] {
  const [r, g, b] = rgbOf(fill);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
    ? [255, 255, 255]
    : [0, 0, 0];
}
