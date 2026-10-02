import type { Shape } from '@/shared/ui';
import type { ContentShapeParams } from '@/pdf/doc/ops/edit';
import { lineEnds } from '@/pdf/doc/ops/edit';
import type { CoverParams } from '@/pdf/doc/ops/cover';
import type { Box } from '@/pdf/doc/types';
import { arrowHead } from '@/pdf/edit/draw-extra-geometry';

/*
 * Edit objects as kit shapes, with the writers' geometry: strokes inside
 * the box (drawBox/drawEllipse inset by half the width), rotation
 * counter-clockwise about the box centre, the arrow head as drawArrow
 * draws it. ShapeLayer strokes do not scale, so widths are multiplied by
 * the view scale.
 */

type Pt = [number, number];
const K = 0.5522847498;

/** Rotation by `deg` counterclockwise about the centre of `box`. */
export function rotator(box: Box, deg: number): (p: Pt) => Pt {
  if (!deg) return (p) => p;
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return ([x, y]) => [
    cx + (x - cx) * c - (y - cy) * s,
    cy + (x - cx) * s + (y - cy) * c,
  ];
}

const inset = (b: Box, d: number): Box => {
  const dx = Math.min(d, b.width / 2);
  const dy = Math.min(d, b.height / 2);
  return {
    x: b.x + dx,
    y: b.y + dy,
    width: b.width - 2 * dx,
    height: b.height - 2 * dy,
  };
};

const pt = (p: Pt) => `${p[0]},${p[1]}`;

function rectPath(b: Box, rot: (p: Pt) => Pt): string {
  const c: Pt[] = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x + b.width, b.y + b.height],
    [b.x, b.y + b.height],
  ];
  return `M${c.map((p) => pt(rot(p))).join(' L')} Z`;
}

function ellipsePath(b: Box, rot: (p: Pt) => Pt): string {
  const rx = b.width / 2;
  const ry = b.height / 2;
  const cx = b.x + rx;
  const cy = b.y + ry;
  const kx = rx * K;
  const ky = ry * K;
  const P = (x: number, y: number) => pt(rot([x, y]));
  return [
    `M${P(cx + rx, cy)}`,
    `C${P(cx + rx, cy + ky)} ${P(cx + kx, cy + ry)} ${P(cx, cy + ry)}`,
    `C${P(cx - kx, cy + ry)} ${P(cx - rx, cy + ky)} ${P(cx - rx, cy)}`,
    `C${P(cx - rx, cy - ky)} ${P(cx - kx, cy - ry)} ${P(cx, cy - ry)}`,
    `C${P(cx + kx, cy - ry)} ${P(cx + rx, cy - ky)} ${P(cx + rx, cy)} Z`,
  ].join(' ');
}

const paint = (hex: string | null, opacity: number) =>
  hex ? { hex, ...(opacity < 1 ? { opacity } : {}) } : undefined;

export function contentShapes(p: ContentShapeParams, scale: number): Shape[] {
  const rot = rotator(p.rect, p.rotate);
  if (p.kind === 'rect' || p.kind === 'ellipse') {
    const b = p.stroke ? inset(p.rect, p.width / 2) : p.rect;
    return [
      {
        kind: 'path',
        d: p.kind === 'rect' ? rectPath(b, rot) : ellipsePath(b, rot),
        fill: paint(p.fill, p.opacity),
        stroke: paint(p.stroke, p.opacity),
        width: p.width * scale,
      },
    ];
  }
  const [from, to] = lineEnds(p);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  let end: Pt = to;
  const shapes: Shape[] = [];
  if (p.kind === 'arrow' && len > 0) {
    const head = arrowHead(p.width, len);
    const ux = (to[0] - from[0]) / len;
    const uy = (to[1] - from[1]) / len;
    const bx = to[0] - ux * head;
    const by = to[1] - uy * head;
    const half = head / 2;
    end = [bx, by];
    shapes.push({
      kind: 'path',
      d: `M${pt(rot(to))} L${pt(rot([bx - uy * half, by + ux * half]))} L${pt(rot([bx + uy * half, by - ux * half]))} Z`,
      fill: paint(p.stroke, p.opacity),
    });
  }
  shapes.unshift({
    kind: 'path',
    d: `M${pt(rot(from))} L${pt(rot(end))}`,
    stroke: paint(p.stroke, p.opacity),
    width: p.width * scale,
  });
  return shapes;
}

export function coverShape(p: CoverParams): Shape {
  return { kind: 'rect', box: p.rect, fill: { hex: p.fill } };
}
