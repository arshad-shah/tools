import type React from 'react';
import { useRef } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  applyPoint,
  invertTransform,
  type OverlayTransform,
  type PageSpaceBox,
} from './overlay-geometry';

export interface PagePoint {
  x: number;
  y: number;
}

export interface PointerLayerProps {
  /** Page space to CSS px (the overlay's transform). */
  transform: OverlayTransform;
  /** A click (or a drag shorter than 4px), in page space. */
  onPoint(p: PagePoint): void;
  /** Pointer position while hovering (null when it leaves). */
  onMove?(p: PagePoint | null): void;
  /** When set, a drag reports the rectangle it spans, in page space. */
  onDrag?(box: PageSpaceBox): void;
  /** Pointer cursor over the layer. */
  cursor?: 'crosshair' | 'copy' | 'text';
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

const DRAG_PX = 4;

/**
 * A transparent layer filling its page slot that turns pointer gestures
 * into page-space points: click to place, hover to preview, drag to draw a
 * box. Pointer only; every use pairs it with a keyboard path (spec §13.2).
 */
export function PointerLayer({
  transform,
  onPoint,
  onMove,
  onDrag,
  cursor = 'crosshair',
  className,
  children,
  'data-testid': testId,
}: PointerLayerProps) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const local = (e: React.PointerEvent | React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toPage = (p: { x: number; y: number }): PagePoint => {
    const inv = invertTransform(transform);
    if (!inv) return { x: 0, y: 0 };
    const [x, y] = applyPoint(inv, p.x, p.y);
    return { x, y };
  };
  return (
    <div
      aria-hidden
      data-testid={testId}
      className={cn(
        'pointer-events-auto absolute inset-0',
        cursor === 'crosshair' && 'cursor-crosshair',
        cursor === 'copy' && 'cursor-copy',
        cursor === 'text' && 'cursor-text',
        className,
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        start.current = { ...local(e), id: e.pointerId };
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => onMove?.(toPage(local(e)))}
      onPointerLeave={() => onMove?.(null)}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s || s.id !== e.pointerId) return;
        const end = local(e);
        const far =
          Math.abs(end.x - s.x) >= DRAG_PX || Math.abs(end.y - s.y) >= DRAG_PX;
        if (far && onDrag) {
          const a = toPage(s);
          const b = toPage(end);
          onDrag({
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            width: Math.abs(b.x - a.x),
            height: Math.abs(b.y - a.y),
          });
        } else onPoint(toPage(end));
      }}
    >
      {children}
    </div>
  );
}
PointerLayer.displayName = 'PointerLayer';
