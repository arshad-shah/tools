import React from 'react';
import { Positioned } from './positioned';
import {
  unmapRect,
  type OverlayTransform,
  type PageSpaceBox,
} from './overlay-geometry';

export interface DrawRectLayerProps {
  /** CSS px of the page slot. */
  width: number;
  height: number;
  /** Page space to CSS px. */
  transform: OverlayTransform;
  /** e.g. "Draw a redaction area on page 3". */
  label: string;
  /** Rectangles smaller than this (CSS px, both sides) are ignored. */
  minSize?: number;
  /** Pointer up: the drawn rectangle in page space. */
  onDraw(box: PageSpaceBox): void;
}

interface Drag {
  pointerId: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * A crosshair surface over a page: drag to draw a rectangle, reported in
 * page space on release. Esc cancels a drag in progress.
 */
export function DrawRectLayer({
  width,
  height,
  transform,
  label,
  minSize = 4,
  onDraw,
}: DrawRectLayerProps) {
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const local = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(width, e.clientX - r.left)),
      Math.max(0, Math.min(height, e.clientY - r.top)),
    ] as const;
  };
  const rect = drag && {
    left: Math.min(drag.x0, drag.x1),
    top: Math.min(drag.y0, drag.y1),
    width: Math.abs(drag.x1 - drag.x0),
    height: Math.abs(drag.y1 - drag.y0),
  };
  return (
    <Positioned
      x={0}
      y={0}
      width={width}
      height={height}
      role="application"
      aria-label={label}
      tabIndex={-1}
      className="cursor-crosshair touch-none"
      onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const [x, y] = local(e);
        setDrag({ pointerId: e.pointerId, x0: x, y0: y, x1: x, y1: y });
      }}
      onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const [x, y] = local(e);
        setDrag({ ...drag, x1: x, y1: y });
      }}
      onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const [x, y] = local(e);
        const done = { ...drag, x1: x, y1: y };
        setDrag(null);
        const r = {
          left: Math.min(done.x0, done.x1),
          top: Math.min(done.y0, done.y1),
          width: Math.abs(done.x1 - done.x0),
          height: Math.abs(done.y1 - done.y0),
        };
        if (r.width < minSize || r.height < minSize) return;
        onDraw(unmapRect(transform, r));
      }}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && drag) {
          e.stopPropagation();
          setDrag(null);
        }
      }}
    >
      {rect ? (
        <Positioned
          x={rect.left}
          y={rect.top}
          width={rect.width}
          height={rect.height}
          aria-hidden
          className="pointer-events-none rounded-sm border-2 border-dashed border-redact bg-danger-soft"
        />
      ) : null}
    </Positioned>
  );
}
DrawRectLayer.displayName = 'DrawRectLayer';
