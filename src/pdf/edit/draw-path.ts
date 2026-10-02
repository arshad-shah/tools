import {
  appendBezierCurve,
  closePath,
  lineTo,
  moveTo,
  type PDFOperator,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';

const ARGS: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

const unreadable = () =>
  new ToolError('INVALID_INPUT', 'The drawing path could not be read');

const TOKEN =
  /([MLHVCSQTAZ])|([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)|([\s,]+)/giy;

function tokenize(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < d.length) {
    const m = TOKEN.exec(d);
    if (!m) throw unreadable();
    if (m[1]) out.push(m[1]);
    else if (m[2]) out.push(Number(m[2]));
  }
  return out;
}

/** Cubic Bezier segments (after the start point) for an SVG elliptical arc. */
function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  angle: number,
  largeArc: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): number[][] {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2))
    return [[x1, y1, x2, y2, x2, y2]];
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy;
  const yp = -sin * dx + cos * dy;
  const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  const coef =
    (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * yp) / ry;
  const cyp = (-coef * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (xp - cxp) / rx;
  const uy = (yp - cyp) / ry;
  const theta = ang(1, 0, ux, uy);
  let delta = ang(ux, uy, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const parts = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  const step = delta / parts;
  const k = (4 / 3) * Math.tan(step / 4);
  const point = (t: number, ox = 0, oy = 0) => {
    const ex = rx * Math.cos(t) + ox;
    const ey = ry * Math.sin(t) + oy;
    return [cx + cos * ex - sin * ey, cy + sin * ex + cos * ey];
  };
  const out: number[][] = [];
  for (let i = 0; i < parts; i++) {
    const t1 = theta + i * step;
    const t2 = t1 + step;
    const [ax, ay] = point(t1);
    const [bx, by] = point(t2);
    // Tangents scaled by k, rotated into place.
    const d1 = [-rx * Math.sin(t1) * k, ry * Math.cos(t1) * k];
    const d2 = [-rx * Math.sin(t2) * k, ry * Math.cos(t2) * k];
    out.push([
      ax + cos * d1[0] - sin * d1[1],
      ay + sin * d1[0] + cos * d1[1],
      bx - (cos * d2[0] - sin * d2[1]),
      by - (sin * d2[0] + cos * d2[1]),
      bx,
      by,
    ]);
  }
  return out;
}

/**
 * SVG path data (M L H V C S Q T A Z, absolute and relative) to PDF path
 * operators, in the same coordinates (no y flip). Unknown commands or
 * missing numbers throw INVALID_INPUT.
 */
export function svgPathToPdf(d: string): PDFOperator[] {
  const tokens = tokenize(d);
  const ops: PDFOperator[] = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  /** Last control point, for S and T reflections. */
  let lastC: [number, number] | null = null;
  let lastQ: [number, number] | null = null;
  const num = () => {
    const t = tokens[i++];
    if (typeof t !== 'number') throw unreadable();
    return t;
  };
  const cubic = (c: number[]) => {
    ops.push(appendBezierCurve(c[0], c[1], c[2], c[3], c[4], c[5]));
    x = c[4];
    y = c[5];
  };
  const quad = (qx: number, qy: number, ex: number, ey: number) => {
    cubic([
      x + (2 / 3) * (qx - x),
      y + (2 / 3) * (qy - y),
      ex + (2 / 3) * (qx - ex),
      ey + (2 / 3) * (qy - ey),
      ex,
      ey,
    ]);
    lastQ = [qx, qy];
  };
  while (i < tokens.length) {
    const t = tokens[i];
    if (typeof t === 'string') {
      cmd = t;
      i++;
    } else if (!cmd || cmd === 'Z' || cmd === 'z') throw unreadable();
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;
    if (ARGS[upper] === undefined) throw unreadable();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    const prevC: [number, number] | null = lastC;
    const prevQ: [number, number] | null = lastQ;
    lastC = null;
    lastQ = null;
    switch (upper) {
      case 'M':
        x = num() + ox;
        y = num() + oy;
        startX = x;
        startY = y;
        ops.push(moveTo(x, y));
        cmd = rel ? 'l' : 'L'; // further pairs are line-tos
        break;
      case 'L':
        x = num() + ox;
        y = num() + oy;
        ops.push(lineTo(x, y));
        break;
      case 'H':
        x = num() + ox;
        ops.push(lineTo(x, y));
        break;
      case 'V':
        y = num() + oy;
        ops.push(lineTo(x, y));
        break;
      case 'C': {
        const c = [num() + ox, num() + oy, num() + ox, num() + oy];
        const end = [num() + ox, num() + oy];
        cubic([...c, ...end]);
        lastC = [c[2], c[3]];
        break;
      }
      case 'S': {
        const c1 = prevC ? [2 * x - prevC[0], 2 * y - prevC[1]] : [x, y];
        const c2 = [num() + ox, num() + oy];
        const end = [num() + ox, num() + oy];
        cubic([...c1, ...c2, ...end]);
        lastC = [c2[0], c2[1]];
        break;
      }
      case 'Q': {
        const qx = num() + ox;
        const qy = num() + oy;
        quad(qx, qy, num() + ox, num() + oy);
        break;
      }
      case 'T': {
        const q = prevQ ? [2 * x - prevQ[0], 2 * y - prevQ[1]] : [x, y];
        quad(q[0], q[1], num() + ox, num() + oy);
        break;
      }
      case 'A': {
        const [rx, ry, rot, large, sweep] = [num(), num(), num(), num(), num()];
        const ex = num() + ox;
        const ey = num() + oy;
        for (const c of arcToCubics(
          x,
          y,
          rx,
          ry,
          rot,
          !!large,
          !!sweep,
          ex,
          ey,
        ))
          cubic(c);
        break;
      }
      case 'Z':
        ops.push(closePath());
        x = startX;
        y = startY;
        break;
    }
  }
  if (ops.length === 0) throw unreadable();
  return ops;
}
