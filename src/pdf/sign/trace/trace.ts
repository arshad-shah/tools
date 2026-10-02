/**
 * Mask to vector: lattice contours, staircase relaxation, RDP to find the
 * corners, and Schneider cubic fitting of the points between corners. The
 * result is an `InkVector` in mask pixels, one closed subpath per contour,
 * meant to be filled with the even-odd rule.
 */
import type { InkVector } from '@/pdf/sign/ink';
import type { Mask } from '@/pdf/sign/photo/binarize';
import { signedArea, traceBoundaries, type Pt } from './boundary';
import { fitCubics, type Cubic } from './fit-curve';
import {
  cornerIndices,
  rdpIndices,
  relaxStaircase,
  splitClosed,
} from './simplify';

export interface TraceOptions {
  /** RDP tolerance in px for corner detection (default 0.8). */
  simplify?: number;
  /** Bezier fitting tolerance in px (default 0.5). */
  curveError?: number;
  /** Contours enclosing less than this many px^2 are dropped (default 12). */
  minArea?: number;
}

const fmt = (v: number) => String(Math.round(v * 100) / 100);
const pt = (p: Pt) => `${fmt(p[0])} ${fmt(p[1])}`;

/** Cubics for one closed contour, split at the corners of its RDP outline. */
function contourCubics(points: Pt[], simplify: number, error: number): Cubic[] {
  const dense = relaxStaircase(points);
  const kept = rdpIndices(dense, simplify, true);
  if (kept.length < 3) return [];
  const corners = cornerIndices(kept.map((i) => dense[i])).map((k) => kept[k]);
  return splitClosed(dense, corners).flatMap((run) => fitCubics(run, error));
}

export function traceMask(m: Mask, o: TraceOptions = {}): InkVector {
  const { simplify = 0.8, curveError = 0.5, minArea = 12 } = o;
  const parts: string[] = [];
  for (const contour of traceBoundaries(m)) {
    if (Math.abs(signedArea(contour.points)) < minArea) continue;
    const cubics = contourCubics(contour.points, simplify, curveError);
    if (!cubics.length) continue;
    let d = `M${pt(cubics[0][0])}`;
    for (const c of cubics) d += `C${pt(c[1])} ${pt(c[2])} ${pt(c[3])}`;
    parts.push(`${d}Z`);
  }
  return { d: parts.join(''), width: m.width, height: m.height };
}
