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
import { PaintCanvas } from './paint-canvas';

export type { Point, Stroke, InkPoint, InkStroke, InkWeight };

export interface SignaturePadProps {
  /** Fixed CSS px size; without it the className sizes the pad. */
  width?: number;
  height?: number;
  /** Accessible name, e.g. "Draw your signature". */
  label: string;
  /** Ink colour (hex or CSS colour). */
  ink: string;
  /** Nib size (thin, medium, bold). */
  weight: InkWeight;
  /** Committed strokes, in pad CSS px. */
  value: InkStroke[];
  /** Called once per finished stroke with the new list (undo is the parent's). */
  onChange(strokes: InkStroke[]): void;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

/** Samples closer than this (pad px) to the last one add nothing. */
const MIN_STEP = 0.75;

/**
 * Ink pen (spec §4.6, plan H-2): tapered, pressure-sensitive outlines from
 * perfect-freehand, filled with the ink. A pen's own pressure and tilt are
 * used; mouse and touch pressure is simulated from velocity. Coalesced
 * pointer events keep fast strokes smooth. Keyboard users take the Type or
 * Upload path instead.
 */
export function SignaturePad({
  width,
  height,
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
  const [live, setLive] = useState<InkStroke | null>(null);

  const paint = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = ink;
      for (const s of live ? [...value, live] : value) {
        const d = outlineToPath(inkOutline(s, weight));
        if (d) ctx.fill(new Path2D(d));
      }
    },
    [value, live, ink, weight],
  );

  const sample = (
    e: React.PointerEvent<HTMLCanvasElement>,
    stroke: InkStroke,
  ): InkStroke => {
    const rect = e.currentTarget.getBoundingClientRect();
    const native = e.nativeEvent as PointerEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [];
    let out = stroke;
    for (const ev of coalesced.length ? coalesced : [native]) {
      const prev: InkPoint | null = out[out.length - 1] ?? null;
      const p = pointFromEvent(ev, rect, prev);
      if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < MIN_STEP) continue;
      out = [...out, p];
    }
    return out;
  };

  const finish = () => {
    const stroke = liveRef.current;
    if (!stroke) return;
    liveRef.current = null;
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
      className={cn('touch-none', className)}
      onPointerDown={(e) => {
        if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        liveRef.current = sample(e, []);
        setLive(liveRef.current);
      }}
      onPointerMove={(e) => {
        if (!liveRef.current) return;
        liveRef.current = sample(e, liveRef.current);
        setLive(liveRef.current);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
    />
  );
}
SignaturePad.displayName = 'SignaturePad';
