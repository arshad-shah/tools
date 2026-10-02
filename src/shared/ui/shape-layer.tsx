import React from 'react';
import { cn } from '@/shared/lib/cn';
import type { OverlayTransform, PageSpaceBox } from './overlay-geometry';
import { resolvePaint, type Paint } from './shape-paint';

export type { Paint, PaintToken } from './shape-paint';

type Box = PageSpaceBox;

export type Shape =
  | {
      kind: 'rect';
      box: Box;
      stroke?: Paint;
      fill?: Paint;
      width?: number;
      dash?: 'solid' | 'dotted' | 'dashed';
      hatch?: boolean;
      radius?: number;
    }
  | { kind: 'ellipse'; box: Box; stroke?: Paint; fill?: Paint; width?: number }
  | {
      kind: 'line';
      from: [number, number];
      to: [number, number];
      stroke: Paint;
      width: number;
      arrowEnd?: boolean;
    }
  /** Polylines in page space. */
  | { kind: 'ink'; points: [number, number][][]; stroke: Paint; width: number }
  /** Page-space path data. */
  | {
      kind: 'path';
      d: string;
      fill?: Paint;
      stroke?: Paint;
      width?: number;
      evenOdd?: boolean;
    }
  /** Highlight quads, 8 numbers each (PDF QuadPoints order). */
  | { kind: 'quads'; quads: number[][]; fill: Paint; blend?: 'multiply' }
  | {
      kind: 'underline' | 'strike' | 'squiggly';
      quads: number[][];
      stroke: Paint;
      width: number;
    };

export interface ShapeLayerProps {
  width: number;
  height: number;
  transform: OverlayTransform;
  shapes: Shape[];
  className?: string;
}

const DASH = { solid: undefined, dotted: '1 3', dashed: '6 4' } as const;

const stroke = (p: Paint | undefined, width = 1) => {
  if (!p) return { stroke: 'none' };
  const { color, opacity } = resolvePaint(p);
  return {
    stroke: color,
    strokeOpacity: opacity,
    strokeWidth: width,
    vectorEffect: 'non-scaling-stroke' as const,
  };
};

const fill = (p: Paint | undefined) => {
  if (!p) return { fill: 'none' };
  const { color, opacity } = resolvePaint(p);
  return { fill: color, fillOpacity: opacity };
};

/** Quad corners [p1, p2, p3, p4]; PDF order is upper-left, upper-right, lower-left, lower-right. */
const corners = (q: number[]) =>
  [0, 2, 4, 6].map((i) => [q[i], q[i + 1]] as [number, number]);

const lerp = (a: [number, number], b: [number, number], t: number) =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as [number, number];

function squiggle(from: [number, number], to: [number, number], amp: number) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = Math.max(2, Math.round(len / (amp * 2)));
  // Normal of the baseline, pointing towards the glyphs.
  const nx = -(to[1] - from[1]) / (len || 1);
  const ny = (to[0] - from[0]) / (len || 1);
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const [x, y] = lerp(from, to, i / steps);
    const s = i % 2 === 0 ? 0 : amp;
    return `${x + nx * s},${y + ny * s}`;
  });
  return `M${pts.join(' L')}`;
}

function textLine(kind: 'underline' | 'strike' | 'squiggly', q: number[]) {
  const [ul, ur, ll, lr] = corners(q);
  const h = Math.hypot(ul[0] - ll[0], ul[1] - ll[1]);
  if (kind === 'strike') return `M${lerp(ll, ul, 0.45)} L${lerp(lr, ur, 0.45)}`;
  const from = lerp(ll, ul, 0.04);
  const to = lerp(lr, ur, 0.04);
  if (kind === 'underline') return `M${from} L${to}`;
  return squiggle(from, to, Math.max(1, h * 0.08));
}

/**
 * One aria-hidden `<svg>` drawing page-space shapes through a group matrix.
 * Strokes do not scale with zoom; arrows use `<marker>`, hatching a
 * `<pattern>`. The accessible twins of shapes are HitAreas.
 */
export function ShapeLayer({
  width,
  height,
  transform: t,
  shapes,
  className,
}: ShapeLayerProps) {
  const uid = React.useId().replace(/:/g, '');
  const defs: React.ReactNode[] = [];
  const body = shapes.map((s, i) => {
    const key = `${s.kind}-${i}`;
    switch (s.kind) {
      case 'rect': {
        const { box } = s;
        let hatch: string | undefined;
        if (s.hatch) {
          hatch = `${uid}-hatch-${i}`;
          const ink = resolvePaint(s.stroke ?? s.fill ?? { token: 'fg' });
          defs.push(
            <pattern
              key={hatch}
              id={hatch}
              width={6}
              height={6}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={6}
                stroke={ink.color}
                strokeWidth={2}
              />
            </pattern>,
          );
        }
        return (
          <g key={key}>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              rx={s.radius}
              {...fill(s.fill)}
              {...stroke(s.stroke, s.width)}
              strokeDasharray={DASH[s.dash ?? 'solid']}
            />
            {hatch ? (
              <rect
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                fill={`url(#${hatch})`}
              />
            ) : null}
          </g>
        );
      }
      case 'ellipse':
        return (
          <ellipse
            key={key}
            cx={s.box.x + s.box.width / 2}
            cy={s.box.y + s.box.height / 2}
            rx={s.box.width / 2}
            ry={s.box.height / 2}
            {...fill(s.fill)}
            {...stroke(s.stroke, s.width)}
          />
        );
      case 'line': {
        let marker: string | undefined;
        if (s.arrowEnd) {
          marker = `${uid}-arrow-${i}`;
          defs.push(
            <marker
              key={marker}
              id={marker}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={5}
              markerHeight={5}
              orient="auto-start-reverse"
            >
              <path
                d="M0,0 L10,5 L0,10 z"
                fill={resolvePaint(s.stroke).color}
              />
            </marker>,
          );
        }
        return (
          <line
            key={key}
            x1={s.from[0]}
            y1={s.from[1]}
            x2={s.to[0]}
            y2={s.to[1]}
            {...stroke(s.stroke, s.width)}
            strokeLinecap="round"
            markerEnd={marker ? `url(#${marker})` : undefined}
          />
        );
      }
      case 'ink':
        return (
          <g key={key} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {s.points.map((line, j) => (
              <polyline
                key={j}
                points={line.map((p) => p.join(',')).join(' ')}
                {...stroke(s.stroke, s.width)}
                fill="none"
              />
            ))}
          </g>
        );
      case 'path':
        return (
          <path
            key={key}
            d={s.d}
            fillRule={s.evenOdd ? 'evenodd' : undefined}
            {...fill(s.fill)}
            {...stroke(s.stroke, s.width)}
          />
        );
      case 'quads':
        return (
          <g
            key={key}
            className={cn(s.blend === 'multiply' && 'mix-blend-multiply')}
          >
            {s.quads.map((q, j) => {
              const [ul, ur, ll, lr] = corners(q);
              return (
                <polygon
                  key={j}
                  points={[ul, ur, lr, ll].map((p) => p.join(',')).join(' ')}
                  {...fill(s.fill)}
                />
              );
            })}
          </g>
        );
      default:
        return (
          <g key={key} fill="none">
            {s.quads.map((q, j) => (
              <path
                key={j}
                d={textLine(s.kind, q)}
                {...stroke(s.stroke, s.width)}
                fill="none"
              />
            ))}
          </g>
        );
    }
  });
  return (
    <svg
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none absolute left-0 top-0', className)}
    >
      {defs.length ? <defs>{defs}</defs> : null}
      <g transform={`matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`}>
        {body}
      </g>
    </svg>
  );
}
ShapeLayer.displayName = 'ShapeLayer';
