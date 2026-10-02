import type React from 'react';
import { cn } from '@/shared/lib/cn';
import {
  applyPoint,
  type OverlayTransform,
  type PageSpaceBox,
} from './overlay-geometry';
import { resolvePaint } from './shape-paint';

export type OverlayFontFamily = 'helvetica' | 'noto' | 'times' | 'courier';

/** CSS font stacks; 'helvetica' and 'noto' are the export fonts loaded as FontFaces. */
const OVERLAY_FONT_STACK: Record<OverlayFontFamily, string> = {
  helvetica: 'PdfHelvetica, Helvetica, Arial, sans-serif',
  noto: 'PdfNoto, "Noto Sans", sans-serif',
  times: '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
};

/** Font metrics per unit of size, as the PDF writer measures them. */
export interface OverlayTextMetrics {
  /** Ascent above the baseline (pdf-lib heightAtSize without descender). */
  ascent: number;
  /** Full glyph height (pdf-lib heightAtSize). */
  height: number;
}

export interface OverlayTextProps {
  transform: OverlayTransform;
  /** The text box, page space. */
  box: PageSpaceBox;
  /** Laid-out lines (from the writer's fitText); `text` split on line breaks otherwise. */
  lines?: readonly string[];
  text: string;
  family: OverlayFontFamily;
  /** Points. */
  size: number;
  /** '#rrggbb'. */
  color: string;
  align: 'left' | 'center' | 'right';
  /** Degrees counterclockwise about the box centre (page space, as the writer). */
  rotate?: number;
  /** Multiple of the size (default 1.2). */
  lineHeight?: number;
  metrics?: OverlayTextMetrics;
  /** 'top' (multiline, the default) or 'middle' (single line), as drawText. */
  valign?: 'top' | 'middle';
  opacity?: number;
  /**
   * Draw one line from a baseline origin instead of laying out in `box`:
   * page-space point and counter-clockwise rotation in degrees (as pdf-lib
   * drawText with `rotate`). `align` and `rotate` are ignored then.
   */
  baseline?: { x: number; y: number; rotate: number };
  /** CSS px size of the overlay it sits in. */
  width: number;
  height: number;
  className?: string;
}

const HELVETICA: OverlayTextMetrics = { ascent: 0.931, height: 1.156 };

/**
 * Non-interactive text drawn in page space with the writer's line layout
 * (spec §6.3 mitigation 1): baselines and alignment follow drawText.
 */
export function OverlayText({
  transform: t,
  box,
  lines,
  text,
  family,
  size,
  color,
  align,
  rotate = 0,
  lineHeight = 1.2,
  metrics = HELVETICA,
  valign = 'top',
  opacity,
  baseline,
  width,
  height,
  className,
}: OverlayTextProps) {
  if (baseline)
    return (
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        className={cn(
          'pointer-events-none absolute top-0 left-0 overflow-visible',
          className,
        )}
      >
        <g
          transform={`matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`}
          fill={resolvePaint({ hex: color }).color}
          fillOpacity={opacity}
          fontFamily={OVERLAY_FONT_STACK[family]}
          fontSize={size}
        >
          <text
            transform={`translate(${baseline.x} ${baseline.y}) rotate(${baseline.rotate}) scale(1 -1)`}
            xmlSpace="preserve"
            style={{ whiteSpace: 'pre' } as React.CSSProperties}
          >
            {lines?.[0] ?? text}
          </text>
        </g>
      </svg>
    );
  const rows = lines ?? text.split(/\r?\n/);
  const { color: fill } = resolvePaint({ hex: color });
  const lineH = size * lineHeight;
  const ascent = metrics.ascent * size;
  const glyphH = metrics.height * size;
  const blockH = rows.length * lineH;
  const blockTop =
    valign === 'top' ? box.y + box.height : box.y + (box.height + blockH) / 2;
  const x =
    align === 'center'
      ? box.x + box.width / 2
      : align === 'right'
        ? box.x + box.width
        : box.x;
  const anchor =
    align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  // Page rotation about the box centre, then the page-to-screen map.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = (rotate * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const [e, f] = applyPoint(
    t,
    cx - cos * cx + sin * cy,
    cy - sin * cx - cos * cy,
  );
  const m = {
    a: t.a * cos + t.c * sin,
    b: t.b * cos + t.d * sin,
    c: -t.a * sin + t.c * cos,
    d: -t.b * sin + t.d * cos,
    e,
    f,
  };
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      className={cn(
        'pointer-events-none absolute left-0 top-0 overflow-visible',
        className,
      )}
    >
      <g
        transform={`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`}
        fill={fill}
        fillOpacity={opacity}
        fontFamily={OVERLAY_FONT_STACK[family]}
        fontSize={size}
        textAnchor={anchor}
      >
        {rows.map((line, i) => {
          const y = blockTop - i * lineH - (lineH - glyphH) / 2 - ascent;
          return (
            <text
              key={i}
              transform={`matrix(1 0 0 -1 ${x} ${y})`}
              xmlSpace="preserve"
              style={{ whiteSpace: 'pre' } as React.CSSProperties}
            >
              {line}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
OverlayText.displayName = 'OverlayText';
