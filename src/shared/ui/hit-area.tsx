import type React from 'react';
import { cn } from '@/shared/lib/cn';
import {
  mapBox,
  type OverlayTransform,
  type PageSpaceBox,
} from './overlay-geometry';

export interface HitAreaProps {
  transform: OverlayTransform;
  box: PageSpaceBox;
  label: string;
  pressed?: boolean;
  onActivate(): void;
  onKeyDown?(e: React.KeyboardEvent): void;
  tabIndex?: 0 | -1;
  'data-testid'?: string;
  children?: React.ReactNode;
}

/**
 * A real, transparent `<button>` sized to a page-space box: the accessible
 * twin of drawn shapes and detected fields. The focus ring stays visible.
 */
export function HitArea({
  transform,
  box,
  label,
  pressed,
  onActivate,
  onKeyDown,
  tabIndex,
  'data-testid': testId,
  children,
}: HitAreaProps) {
  const r = mapBox(transform, box);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      tabIndex={tabIndex}
      data-testid={testId}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      className={cn(
        'pointer-events-auto absolute cursor-pointer rounded-sm bg-transparent outline-none transition-colors duration-fast',
        'hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-focus',
        pressed && 'ring-2 ring-accent-indicator',
      )}
      style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
    >
      {children}
    </button>
  );
}
HitArea.displayName = 'HitArea';
