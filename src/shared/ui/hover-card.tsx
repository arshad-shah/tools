import React from 'react';
import { HoverCard as CyHoverCard } from '@arshad-shah/cynosure';
import { toPlacement, type Align, type Anchor, type Side } from './position';

export interface HoverCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'style'
> {
  /** The owner decides when it shows (hover, row focus and so on). */
  open: boolean;
  anchor: Anchor;
  side?: Side;
  /** Kept for the callers; Cynosure slides the card along its anchor. */
  align?: Align;
  /** Gap between the anchor and the card, CSS px. */
  offset?: number;
  children: React.ReactNode;
}

/**
 * Cynosure's HoverCard: a passive preview beside its anchor (a larger
 * thumbnail on hover). It takes no pointer or focus and is hidden from
 * assistive tech, since it only repeats what the anchor already names. It
 * flips to the other side and slides along its anchor to stay on screen.
 * Other attributes (a label, a test id) go on the card's content.
 */
export function HoverCard({
  open,
  anchor,
  side = 'right',
  align,
  offset = 12,
  className,
  children,
  ...rest
}: HoverCardProps) {
  void align; // Cynosure slides the card along its anchor itself.
  return (
    <CyHoverCard
      open={open}
      anchor={anchor}
      placement={toPlacement(side)}
      className={className}
      style={{ '--cy-hover-card-offset': `${offset}px` } as React.CSSProperties}
    >
      {open ? (
        <div data-hover-card="" {...rest}>
          {children}
        </div>
      ) : null}
    </CyHoverCard>
  );
}
HoverCard.displayName = 'HoverCard';
