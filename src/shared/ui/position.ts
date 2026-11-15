/**
 * The anchoring vocabulary of the kit's floating surfaces (Tooltip,
 * Popover, HoverCard, DropdownMenu, AnchoredToolbar). Cynosure places them
 * all: top layer, flipped and shifted to stay inside the viewport, following
 * their anchor through scrolling and resizing.
 */
import type { RefObject } from 'react';
import type { TooltipProps } from '@arshad-shah/cynosure';

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A virtual anchor, e.g. a text selection rectangle. */
export type VirtualAnchor = { getBoundingClientRect(): DOMRect };
export type Anchor = RefObject<HTMLElement | null> | VirtualAnchor;

/** Cynosure's placement: a side, with left and right as the inline ends. */
export type Placement = NonNullable<TooltipProps['placement']>;

export const isRefAnchor = (a: Anchor): a is RefObject<HTMLElement | null> =>
  'current' in a;

/** The Cynosure placement for a kit side (left is start in a left-to-right page). */
export function toPlacement(side: Side): Placement {
  return side === 'left' ? 'start' : side === 'right' ? 'end' : side;
}
