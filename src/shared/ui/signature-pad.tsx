import { useCallback, useRef, useState } from 'react';
import {
  inkOutline,
  outlineToPath,
  pointFromEvent,
  type InkPoint,
  type InkStroke,
  type InkWeight,
} from '@/shared/lib/ink';
import type { Point, Stroke } from '@/shared/lib/stroke';
import { cn } from '@/shared/lib/cn';
import { PaintCanvas, type PaintSize } from './paint-canvas';

export type { Point, Stroke, InkPoint, InkStroke, InkWeight };

export interface SignaturePadProps {
  /** Fixed CSS px size; without it the className sizes the pad. */
  width?: number;
  height?: number;
  /**
   * The coordinate space strokes are recorded in. Without it strokes are in
   * the shown CSS px; with it they keep their place and weight however big
   * the pad is shown (phone width, browser text size, a resize mid-drawing).
   */
  space?: { width: number; height: number };
  /** Accessible name, e.g. "Draw your signature". */
  label: string;
  /** Ink colour (hex or CSS colour). */
  ink: string;
  /** Nib size (thin, medium, bold). */
  weight: InkWeight;
  /** Committed strokes, in the pad's coordinate space. */
  value: InkStroke[];
  /** Called once per finished stroke with the new list (undo is the parent's). */
  onChange(strokes: InkStroke[]): void;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

/** Samples closer than this (pad px) to the last one add nothing. */
const MIN_STEP = 0.75;

/** Touch is ignored for this long after the pen was last seen (palm rejection). */
const PALM_MS = 3000;

/**
 * Ink pen (spec §4.6, plan H-2): tapered, pressure-sensitive outlines from
 * perfect-freehand, filled with the ink. A pen's own pressure and tilt are
 * used; mouse and touch pressure is simulated from velocity. Coalesced
 * pointer events keep fast strokes smooth. One pointer draws at a time, and
 * while a pen is in use (touching or hovering) touches are a resting palm.
 * Keyboard users take the Type or Upload path instead.
 */
export function SignaturePad({
  width,
  height,
  space,
  label,
  ink,
  weight,
  value,
  onChange,
  disabled,
  className,
  'aria-describedby': describedBy,
}: SignaturePadProps) {
  // The source of truth while drawing: several pointer events can arrive
  // between renders; state only mirrors it.
  const liveRef = useRef<InkStroke | null>(null);
  const pointerRef = useRef<number | null>(null);
  const penSeenRef = useRef(-Infinity);
  const [live, setLive] = useState<InkStroke | null>(null);

  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, size: PaintSize) => {
      if (space)
        ctx.scale(size.width / space.width, size.height / space.height);
      ctx.fillStyle = ink;
      for (const s of live ? [...value, live] : value) {
        const d = outlineToPath(inkOutline(s, weight));
        if (d) ctx.fill(new Path2D(d));
      }
    },
    [value, live, ink, weight, space],
  );

  const sample = (
    e: React.PointerEvent<HTMLCanvasElement>,
    stroke: InkStroke,
  ): InkStroke => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = space
      ? {
          x: rect.width > 0 ? space.width / rect.width : 1,
          y: rect.height > 0 ? space.height / rect.height : 1,
        }
      : undefined;
    const native = e.nativeEvent as PointerEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [];
    let out = stroke;
    for (const ev of coalesced.length ? coalesced : [native]) {
      const prev: InkPoint | null = out[out.length - 1] ?? null;
      const p = pointFromEvent(ev, rect, prev, scale);
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < MIN_STEP) continue;
      out = [...out, p];
    }
    return out;
  };

  /** Whether this event belongs to the stroke being drawn. */
  const ours = (e: React.PointerEvent) =>
    liveRef.current !== null && e.pointerId === pointerRef.current;

  const notePen = (e: React.PointerEvent) => {
    if (e.pointerType === 'pen') penSeenRef.current = e.timeStamp;
  };

  const finish = (e: React.PointerEvent<HTMLCanvasElement>) => {
    notePen(e);
    if (!ours(e)) return;
    const stroke = liveRef.current!;
    liveRef.current = null;
    pointerRef.current = null;
    setLive(null);
    onChange([...value, stroke]);
  };

  return (
    <PaintCanvas
      label={label}
      aria-describedby={describedBy}
      paint={paint}
      width={width}
      height={height}
      className={cn('touch-none select-none', className)}
      onPointerDown={(e) => {
        notePen(e);
        // One stroke at a time: a second finger or a resting palm doesn't
        // replace the stroke being drawn.
        if (disabled || liveRef.current) return;
        // Only the tip (or the primary mouse button) draws: not a pen's
        // barrel button or eraser end.
        if (e.pointerType !== 'touch' && e.button !== 0) return;
        if (
          e.pointerType === 'touch' &&
          e.timeStamp - penSeenRef.current < PALM_MS
        )
          return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        pointerRef.current = e.pointerId;
        liveRef.current = sample(e, []);
        setLive(liveRef.current);
      }}
      onPointerMove={(e) => {
        notePen(e);
        if (!ours(e)) return;
        liveRef.current = sample(e, liveRef.current!);
        setLive(liveRef.current);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      // A long press with a pen or finger opens the context menu on Windows
      // and Android, which cancels the stroke.
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
SignaturePad.displayName = 'SignaturePad';
