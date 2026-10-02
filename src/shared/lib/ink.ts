import { getStroke } from 'perfect-freehand';

/*
 * Ink pen geometry (plan H-2): pressure from the pen or simulated from
 * velocity, tapered outlines from perfect-freehand, SVG path data. Lives in
 * the kit's lib so SignaturePad draws exactly what the PDF gets.
 */

/** One pointer sample: pad px (y down), pressure 0..1, tilt degrees, time ms. */
export interface InkPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  t: number;
}
export type InkStroke = InkPoint[];
export type InkWeight = 'thin' | 'medium' | 'bold';

/** Base nib size in pad px at 1x. */
export const INK_WEIGHTS: Record<InkWeight, number> = {
  thin: 2.2,
  medium: 3.4,
  bold: 5,
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/**
 * Pressure for a pointer that reports none: fast moves thin the line out,
 * slow ones thicken it, eased so the width never jumps.
 */
export function simulatedPressure(
  prev: InkPoint | null,
  x: number,
  y: number,
  t: number,
  prevPressure: number,
): number {
  if (!prev) return prevPressure;
  const v = Math.hypot(x - prev.x, y - prev.y) / Math.max(1, t - prev.t);
  const target = clamp(1 - v / 1.5, 0.2, 1);
  return clamp(prevPressure + (target - prevPressure) * 0.35, 0.2, 1);
}

/** A sample from a pointer event; a pen gives real pressure and tilt. */
export function pointFromEvent(
  e: PointerEvent,
  rect: DOMRect,
  prev: InkPoint | null,
): InkPoint {
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const t = e.timeStamp;
  if (e.pointerType === 'pen')
    return {
      x,
      y,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
      tiltX: e.tiltX ?? 0,
      tiltY: e.tiltY ?? 0,
      t,
    };
  return {
    x,
    y,
    pressure: simulatedPressure(prev, x, y, t, prev?.pressure ?? 0.5),
    tiltX: 0,
    tiltY: 0,
    t,
  };
}

/** The filled outline of one stroke (a closed polygon, pad px). */
export function inkOutline(
  stroke: InkStroke,
  weight: InkWeight,
  scale = 1,
): [number, number][] {
  if (stroke.length === 0) return [];
  const tilt =
    stroke.reduce((s, p) => s + Math.hypot(p.tiltX, p.tiltY), 0) /
    stroke.length;
  const size =
    INK_WEIGHTS[weight] * scale * (1 + 0.25 * Math.min(1, tilt / 60));
  return getStroke(
    stroke.map((p) => [p.x, p.y, p.pressure]),
    {
      size,
      thinning: 0.62,
      smoothing: 0.55,
      streamline: 0.45,
      simulatePressure: false,
      start: { taper: true, cap: true },
      end: { taper: true, cap: true },
      last: true,
    },
  ) as [number, number][];
}

const f = (n: number) => Math.round(n * 100) / 100;

/**
 * SVG path data for a closed outline: smooth quadratics through the
 * midpoints, written as the equivalent cubics, so the path only uses M, C
 * and Z (what the PDF writer and Path2D both read the same way).
 */
export function outlineToPath(outline: [number, number][]): string {
  const n = outline.length;
  if (n < 2) return '';
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  let cur = mid(outline[n - 1], outline[0]);
  let d = `M${f(cur[0])} ${f(cur[1])}`;
  for (let i = 0; i < n; i++) {
    const q = outline[i];
    const end = mid(q, outline[(i + 1) % n]);
    const c1 = [
      cur[0] + (2 / 3) * (q[0] - cur[0]),
      cur[1] + (2 / 3) * (q[1] - cur[1]),
    ];
    const c2 = [
      end[0] + (2 / 3) * (q[0] - end[0]),
      end[1] + (2 / 3) * (q[1] - end[1]),
    ];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(end[0])} ${f(end[1])}`;
    cur = end;
  }
  return `${d}Z`;
}
