import { getStroke } from 'perfect-freehand';

/*
 * Ink pen geometry (plan H-2): pressure from the pen (even for a mouse or
 * finger), round-capped outlines from perfect-freehand, SVG path data. Lives in
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
 * Pressure for a mouse or finger, which report none. Constant, like a
 * ballpoint: pressure simulated from speed made the width wobble whenever
 * the hand sped up or slowed down, which no real pen does.
 */
export const MOUSE_PRESSURE = 0.5;

/**
 * A pen's raw pressure through a response curve, eased against the last
 * sample. Pens report light writing as 0.1-0.3, a hairline if used raw, so
 * the curve lifts the low end; easing hides the digitiser's jitter.
 */
export function penPressure(raw: number, prev: number | null): number {
  const curved = 0.15 + 0.85 * Math.pow(clamp(raw, 0, 1), 0.65);
  return prev === null ? curved : prev + (curved - prev) * 0.5;
}

/**
 * A sample from a pointer event; a pen gives real pressure and tilt.
 * `scale` maps the shown px to the pad's coordinate space.
 */
export function pointFromEvent(
  e: PointerEvent,
  rect: DOMRect,
  prev: InkPoint | null,
  scale: { x: number; y: number } = { x: 1, y: 1 },
): InkPoint {
  const x = (e.clientX - rect.left) * scale.x;
  const y = (e.clientY - rect.top) * scale.y;
  const t = e.timeStamp;
  if (e.pointerType === 'pen')
    return {
      x,
      y,
      // A pen reports 0 as it lifts off: keep the last pressure rather than
      // jumping to a default, which left a blob at the end of each stroke.
      pressure:
        e.pressure > 0
          ? penPressure(e.pressure, prev?.pressure ?? null)
          : (prev?.pressure ?? MOUSE_PRESSURE),
      tiltX: e.tiltX ?? 0,
      tiltY: e.tiltY ?? 0,
      t,
    };
  return { x, y, pressure: MOUSE_PRESSURE, tiltX: 0, tiltY: 0, t };
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
      thinning: 0.6,
      smoothing: 0.5,
      // Low: a high streamline lags behind the pen and rounds off corners.
      streamline: 0.2,
      simulatePressure: false,
      // No taper: perfect-freehand's `taper: true` tapers over the whole
      // stroke, which faded every stroke's ends and lost short flicks. A
      // pen's own pressure gives the natural start and lift-off.
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
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
