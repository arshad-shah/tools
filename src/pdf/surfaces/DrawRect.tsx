import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { screenRectToBox, type Viewport } from '@/pdf/doc/geometry';
import type { Box } from '@/pdf/doc/types';

export interface DrawRectProps {
  /** CSS px of the page slot. */
  width: number;
  height: number;
  viewport: Viewport;
  /** e.g. "Draw a redaction area on page 3". */
  label: string;
  /** Rectangles smaller than this (CSS px, both sides) are ignored. */
  minSize?: number;
  /** Danger (redaction) or accent outline while drawing. */
  tone?: 'danger' | 'accent';
  /** Pointer up: the drawn rectangle in page space. */
  onDraw(box: Box): void;
}

interface Drag {
  pointerId: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const rectOf = (d: Drag) => ({
  left: Math.min(d.x0, d.x1),
  top: Math.min(d.y0, d.y1),
  width: Math.abs(d.x1 - d.x0),
  height: Math.abs(d.y1 - d.y0),
});

/**
 * A crosshair drawing surface over a page: drag to draw a rectangle,
 * reported in page space on release. Esc cancels a drag in progress.
 */
export function DrawRect({
  width,
  height,
  viewport,
  label,
  minSize = 4,
  tone = 'accent',
  onDraw,
}: DrawRectProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const local = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(width, e.clientX - r.left)),
      Math.max(0, Math.min(height, e.clientY - r.top)),
    ] as const;
  };
  const rect = drag && rectOf(drag);
  const colour = `var(--cy-color-${tone})`;
  return (
    <div
      role="application"
      aria-label={label}
      tabIndex={-1}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: 'crosshair',
        touchAction: 'none',
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const [x, y] = local(e);
        setDrag({ pointerId: e.pointerId, x0: x, y0: y, x1: x, y1: y });
      }}
      onPointerMove={(e) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const [x, y] = local(e);
        setDrag({ ...drag, x1: x, y1: y });
      }}
      onPointerUp={(e) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const [x, y] = local(e);
        const r = rectOf({ ...drag, x1: x, y1: y });
        setDrag(null);
        if (r.width < minSize || r.height < minSize) return;
        onDraw(screenRectToBox(viewport, r));
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Escape' && drag) {
          e.stopPropagation();
          setDrag(null);
        }
      }}
    >
      {rect ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            pointerEvents: 'none',
            borderRadius: 'var(--cy-radius-sm)',
            border: `2px dashed ${colour}`,
            background: `color-mix(in oklab, ${colour} 14%, transparent)`,
          }}
        />
      ) : null}
    </div>
  );
}
