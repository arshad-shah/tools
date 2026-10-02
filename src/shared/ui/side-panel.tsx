import React from 'react';
import { cn } from '@/shared/lib/cn';

export interface SidePanelProps {
  side: 'left' | 'right';
  label: string;
  /** CSS px. */
  width: number;
  minWidth?: number;
  maxWidth?: number;
  /** Present: a resize separator on the inner edge. */
  onResize?(w: number): void;
  collapsed?: boolean;
  children: React.ReactNode;
}

const KEY_STEP = 8;

/**
 * Docked complementary panel (page rail, inspector). The optional separator
 * is keyboard operable: ArrowLeft/Right move it 8px, Home/End jump to the
 * limits; pointer drags use pointer capture.
 */
export function SidePanel({
  side,
  label,
  width,
  minWidth = 120,
  maxWidth = 480,
  onResize,
  collapsed = false,
  children,
}: SidePanelProps) {
  const drag = React.useRef<{ x: number; w: number } | null>(null);
  const clamp = (w: number) =>
    Math.round(Math.min(maxWidth, Math.max(minWidth, w)));
  // Moving the separator right widens a left panel and narrows a right one.
  const sign = side === 'left' ? 1 : -1;

  if (collapsed) return null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onResize) return;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = width - KEY_STEP * sign;
    else if (e.key === 'ArrowRight') next = width + KEY_STEP * sign;
    else if (e.key === 'Home') next = minWidth;
    else if (e.key === 'End') next = maxWidth;
    if (next === null) return;
    e.preventDefault();
    onResize(clamp(next));
  };

  return (
    <aside
      aria-label={label}
      className={cn(
        'relative flex h-full shrink-0 flex-col overflow-hidden bg-surface',
        side === 'left' ? 'border-r border-line' : 'border-l border-line',
      )}
      style={{ width }}
    >
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {onResize ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label}`}
          aria-valuenow={width}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            drag.current = { x: e.clientX, w: width };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) onResize(clamp(d.w + (e.clientX - d.x) * sign));
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          className={cn(
            'absolute top-0 z-rail h-full w-1.5 cursor-col-resize touch-none outline-none transition-colors duration-fast',
            'hover:bg-accent-soft focus-visible:bg-accent-indicator',
            side === 'left' ? '-right-0.5' : '-left-0.5',
          )}
        />
      ) : null}
    </aside>
  );
}
SidePanel.displayName = 'SidePanel';
