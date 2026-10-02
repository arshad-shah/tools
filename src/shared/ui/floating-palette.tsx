import React from 'react';
import { cn } from '@/shared/lib/cn';
import { IconGripVertical } from '@/shared/ui/icons';
import { Toolbar, type ToolGroup, type ToolbarSize } from './toolbar';

export interface FloatingPaletteProps {
  label: string;
  groups: ToolGroup[];
  side: 'left' | 'right';
  onSideChange(s: 'left' | 'right'): void;
  /** lg: 44px tools and grip for touch (spec §13.2). Default md. */
  size?: ToolbarSize;
}

/**
 * The Focus-layout tools: a vertical Toolbar in a card docked to one edge.
 * Drag the grip to the other half of the screen to switch sides (it snaps
 * on release); Alt+ArrowLeft/Right anywhere in the card does the same.
 */
export function FloatingPalette({
  label,
  groups,
  side,
  onSideChange,
  size = 'md',
}: FloatingPaletteProps) {
  const drag = React.useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = React.useState<{ x: number; y: number } | null>(
    null,
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!e.altKey) return;
    const to =
      e.key === 'ArrowLeft' ? 'left' : e.key === 'ArrowRight' ? 'right' : null;
    if (!to) return;
    // Alt+Left would otherwise navigate back.
    e.preventDefault();
    if (to !== side) onSideChange(to);
  };

  return (
    <div
      onKeyDown={onKeyDown}
      data-side={side}
      className={cn(
        'fixed top-1/2 z-toolbar flex max-h-[calc(100dvh-7rem)] -translate-y-1/2 flex-col items-center gap-1 rounded-xl bg-surface p-1.5 shadow-e3',
        side === 'left' ? 'left-3' : 'right-3',
        offset && 'opacity-90',
      )}
      style={
        offset
          ? { translate: `${offset.x}px calc(-50% + ${offset.y}px)` }
          : undefined
      }
    >
      <button
        type="button"
        aria-label={`Move ${label.toLowerCase()} palette (Alt and arrow keys)`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setOffset({ x: e.clientX - d.x, y: e.clientY - d.y });
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          drag.current = null;
          setOffset(null);
          const to = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
          if (to !== side) onSideChange(to);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setOffset(null);
        }}
        className={cn(
          'flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-fg-subtle outline-none transition-colors duration-fast hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-focus active:cursor-grabbing',
          size === 'lg' ? 'size-11' : 'h-5 w-(--control-icon-sm)',
        )}
      >
        <IconGripVertical size="sm" className="rotate-90" />
      </button>
      <Toolbar
        label={label}
        groups={groups}
        orientation="vertical"
        size={size}
      />
    </div>
  );
}
FloatingPalette.displayName = 'FloatingPalette';
