import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/cn';
import {
  useAnchoredFloating,
  type Align,
  type Anchor,
  type Side,
} from './position';

export interface HoverCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'style'
> {
  /** The owner decides when it shows (hover, row focus and so on). */
  open: boolean;
  anchor: Anchor;
  side?: Side;
  align?: Align;
  offset?: number;
  children: React.ReactNode;
}

/**
 * A passive preview beside its anchor (a larger thumbnail on hover). It
 * takes no pointer or focus and is hidden from assistive tech, since it only
 * repeats what the anchor already names. The kit positioner keeps it inside
 * the viewport: it flips to the other side and slides along its anchor.
 */
export function HoverCard({
  open,
  anchor,
  side = 'right',
  align = 'center',
  offset = 12,
  className,
  children,
  ...rest
}: HoverCardProps) {
  const {
    setFloating,
    side: placedSide,
    style,
  } = useAnchoredFloating({
    open,
    anchor,
    side,
    align,
    offset,
  });
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={setFloating}
      aria-hidden
      data-hover-card=""
      data-side={placedSide}
      className={cn(
        'pointer-events-none z-floating rounded-md border border-line-strong bg-surface-2 p-2 shadow-e2',
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
}
HoverCard.displayName = 'HoverCard';
