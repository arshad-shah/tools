import { useCallback, useRef, useState } from 'react';
import {
  addPoint,
  strokePath,
  type Point,
  type Stroke,
} from '@/shared/lib/stroke';
import { cn } from '@/shared/lib/cn';
import { PaintCanvas } from './paint-canvas';

export type { Point, Stroke };

export interface SignaturePadProps {
  /** Committed strokes, in pad CSS px. */
  value: Stroke[];
  /** Called once per finished stroke with the new list. */
  onChange(strokes: Stroke[]): void;
  /** Accessible name, e.g. "Draw your signature". */
  label: string;
  /** Ink colour (hex or CSS colour). */
  ink: string;
  /** CSS px. */
  strokeWidth?: number;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

/**
 * Pointer drawing surface (spec §4.6). Owns its canvas; keyboard users take
 * the Type or Upload path instead (spec §4.6).
 */
export function SignaturePad({
  value,
  onChange,
  label,
  ink,
  strokeWidth = 2.5,
  disabled,
  className,
  'aria-describedby': describedBy,
}: SignaturePadProps) {
  // The source of truth while drawing: several pointer events can arrive
  // between renders; state only mirrors it.
  const liveRef = useRef<Stroke | null>(null);
  const [live, setLive] = useState<Stroke | null>(null);

  const paint = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = ink;
      for (const s of live ? [...value, live] : value)
        ctx.stroke(new Path2D(strokePath(s)));
    },
    [value, live, ink, strokeWidth],
  );

  const point = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
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
      className={cn('touch-none', className)}
      onPointerDown={(e) => {
        if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        liveRef.current = [point(e)];
        setLive(liveRef.current);
      }}
      onPointerMove={(e) => {
        if (!liveRef.current) return;
        liveRef.current = addPoint(liveRef.current, point(e));
        setLive(liveRef.current);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
    />
  );
}
SignaturePad.displayName = 'SignaturePad';
