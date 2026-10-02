import { ToolError } from '@/shared/lib/errors';
import {
  inkOutline,
  outlineToPath,
  type InkStroke,
  type InkWeight,
} from '@/shared/lib/ink';
import type { Box } from '@/pdf/doc/types';

// The pen geometry lives in the kit's lib so SignaturePad draws the same
// outlines; this module adds the vector the PDF writer embeds.
export * from '@/shared/lib/ink';

/** A vector signature: SVG path data in pad px (y down) and its frame size. */
export interface InkVector {
  d: string;
  width: number;
  height: number;
}

/** Frame margin around the ink, pad px. */
const MARGIN = 2;

/**
 * All strokes as one path (a subpath per stroke), cropped to the ink plus
 * 2px. Samples are kept inside the pad: what the pad showed is what is kept.
 */
export function inkToVector(
  strokes: InkStroke[],
  weight: InkWeight,
  pad: { width: number; height: number },
): InkVector {
  const outlines = strokes
    .filter((s) => s.length > 0)
    .map((s) =>
      inkOutline(
        s.map((p) => ({
          ...p,
          x: Math.min(pad.width, Math.max(0, p.x)),
          y: Math.min(pad.height, Math.max(0, p.y)),
        })),
        weight,
      ),
    )
    .filter((o) => o.length > 1);
  const all = outlines.flat();
  if (all.length === 0)
    throw new ToolError('INVALID_INPUT', 'Draw your signature first');
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs) - MARGIN;
  const y0 = Math.min(...ys) - MARGIN;
  const d = outlines
    .map((o) =>
      outlineToPath(o.map(([x, y]): [number, number] => [x - x0, y - y0])),
    )
    .join('');
  return {
    d,
    width: Math.max(...xs) + MARGIN - x0,
    height: Math.max(...ys) + MARGIN - y0,
  };
}

/**
 * The page-space transform (y up) that draws `v` as large as fits in
 * `box`, aspect kept and centred. The path data itself is unchanged.
 */
export function fitVectorToBox(
  v: InkVector,
  box: Box,
): { d: string; transform: [number, number, number, number, number, number] } {
  const s = Math.min(box.width / v.width, box.height / v.height);
  const x = box.x + (box.width - v.width * s) / 2;
  const y = box.y + (box.height - v.height * s) / 2;
  return { d: v.d, transform: [s, 0, 0, -s, x, y + v.height * s] };
}
