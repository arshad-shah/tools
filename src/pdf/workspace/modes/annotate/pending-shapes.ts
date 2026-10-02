import type { Shape } from '@/shared/ui';
import {
  arrowBarbs,
  darker,
  markupStroke,
  NOTE_SIZE,
  STAMP_BORDER,
} from '@/pdf/edit/annot/geometry';
import type {
  InkParams,
  LineParams,
  MarkupParams,
  NoteParams,
  ShapeParams,
  StampParams,
  FreeTextParams,
} from '@/pdf/doc/ops/annotate-params';
import type { Box, OverlayItem } from '@/pdf/doc/types';

/*
 * Pending annotations as kit shapes, drawn with the writers' geometry.
 * ShapeLayer strokes do not scale with zoom, so widths in points are
 * multiplied by the view scale to match the export.
 */

const inset = (b: Box, w: number): Box => ({
  x: b.x + w / 2,
  y: b.y + w / 2,
  width: Math.max(0, b.width - w),
  height: Math.max(0, b.height - w),
});

const quadHeight = (q: number[]) => Math.hypot(q[0] - q[4], q[1] - q[5]);

/** The page-space box an annotation occupies (hit areas, selection). */
export function boundsOf(item: OverlayItem): Box | null {
  const p = item.params as Record<string, unknown>;
  switch (item.type) {
    case 'annot.markup': {
      const qs = (p as unknown as MarkupParams).quads;
      const xs = qs.flatMap((q) => [q[0], q[2], q[4], q[6]]);
      const ys = qs.flatMap((q) => [q[1], q[3], q[5], q[7]]);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }
    case 'annot.note': {
      const [x, y] = (p as unknown as NoteParams).at;
      return { x, y, width: NOTE_SIZE, height: NOTE_SIZE };
    }
    case 'annot.ink': {
      const pts = (p as unknown as InkParams).strokes.flat();
      const w = (p as unknown as InkParams).width;
      const xs = pts.map((q) => q[0]);
      const ys = pts.map((q) => q[1]);
      return {
        x: Math.min(...xs) - w,
        y: Math.min(...ys) - w,
        width: Math.max(...xs) - Math.min(...xs) + 2 * w,
        height: Math.max(...ys) - Math.min(...ys) + 2 * w,
      };
    }
    case 'annot.line': {
      const l = p as unknown as LineParams;
      const pad = l.width + 2;
      return {
        x: Math.min(l.from[0], l.to[0]) - pad,
        y: Math.min(l.from[1], l.to[1]) - pad,
        width: Math.abs(l.to[0] - l.from[0]) + 2 * pad,
        height: Math.abs(l.to[1] - l.from[1]) + 2 * pad,
      };
    }
    case 'annot.freetext':
    case 'annot.shape':
    case 'annot.stamp':
      return (p as unknown as { rect: Box }).rect;
    default:
      return null;
  }
}

const hex = (color: string, opacity?: number) => ({
  hex: color,
  ...(opacity !== undefined && opacity < 1 ? { opacity } : {}),
});

/** Kit shapes for one pending annotation (text parts are drawn separately). */
export function shapesOf(item: OverlayItem, scale: number): Shape[] {
  switch (item.type) {
    case 'annot.markup': {
      const m = item.params as MarkupParams;
      if (m.subtype === 'Highlight')
        return [
          {
            kind: 'quads',
            quads: m.quads,
            fill: hex(m.color, m.opacity),
            blend: 'multiply',
          },
        ];
      const kind =
        m.subtype === 'Underline'
          ? 'underline'
          : m.subtype === 'StrikeOut'
            ? 'strike'
            : 'squiggly';
      return [
        {
          kind,
          quads: m.quads,
          stroke: hex(m.color, m.opacity),
          width: markupStroke(quadHeight(m.quads[0])) * scale,
        },
      ];
    }
    case 'annot.note': {
      const n = item.params as NoteParams;
      return [
        {
          kind: 'rect',
          box: {
            x: n.at[0] + 1,
            y: n.at[1] + 1,
            width: NOTE_SIZE - 2,
            height: NOTE_SIZE - 2,
          },
          fill: hex(n.color),
          stroke: hex(darker(n.color)),
          width: 1,
          radius: 3,
        },
      ];
    }
    case 'annot.ink': {
      const k = item.params as InkParams;
      return [
        {
          kind: 'ink',
          points: k.strokes,
          stroke: hex(k.color, k.opacity),
          width: k.width * scale,
        },
      ];
    }
    case 'annot.shape': {
      const s = item.params as ShapeParams;
      return [
        {
          kind: s.kind === 'Square' ? 'rect' : 'ellipse',
          box: inset(s.rect, s.width),
          stroke: hex(s.color),
          ...(s.fill ? { fill: hex(s.fill) } : {}),
          width: s.width * scale,
        },
      ];
    }
    case 'annot.line': {
      const l = item.params as LineParams;
      const shapes: Shape[] = [
        {
          kind: 'line',
          from: l.from,
          to: l.to,
          stroke: hex(l.color),
          width: l.width * scale,
        },
      ];
      if (l.arrowEnd) {
        const [a, b] = arrowBarbs(l.from, l.to, l.width);
        shapes.push({
          kind: 'path',
          d: `M${a[0]},${a[1]} L${l.to[0]},${l.to[1]} L${b[0]},${b[1]}`,
          stroke: hex(l.color),
          width: l.width * scale,
        });
      }
      return shapes;
    }
    case 'annot.freetext': {
      const f = item.params as FreeTextParams;
      return f.border
        ? [
            {
              kind: 'rect',
              box: inset(f.rect, 1),
              stroke: hex(f.color),
              width: scale,
            },
          ]
        : [];
    }
    case 'annot.stamp': {
      const s = item.params as StampParams;
      if (s.image) return [];
      return [
        {
          kind: 'rect',
          box: inset(s.rect, STAMP_BORDER),
          stroke: hex(s.color),
          width: STAMP_BORDER * scale,
          radius: 6,
        },
      ];
    }
    default:
      return [];
  }
}

const SUBTYPE_NAMES: Record<string, string> = {
  'annot.note': 'Note',
  'annot.freetext': 'Text comment',
  'annot.ink': 'Drawing',
  'annot.line': 'Line',
  'annot.stamp': 'Stamp',
};

/** "Highlight", "Rectangle", ... for labels and the comments list. */
export function kindName(item: OverlayItem): string {
  const p = item.params as Record<string, unknown>;
  if (item.type === 'annot.markup')
    return (
      {
        Highlight: 'Highlight',
        Underline: 'Underline',
        StrikeOut: 'Strikeout',
        Squiggly: 'Squiggly underline',
      } as Record<string, string>
    )[p.subtype as string];
  if (item.type === 'annot.shape')
    return p.kind === 'Square' ? 'Rectangle' : 'Ellipse';
  if (item.type === 'annot.line') return p.arrowEnd ? 'Arrow' : 'Line';
  return SUBTYPE_NAMES[item.type] ?? 'Annotation';
}

/** The text a pending annotation carries (comments list, edit). */
export function textOf(item: OverlayItem): string {
  const p = item.params as { contents?: string; text?: string };
  return p.text ?? p.contents ?? '';
}
