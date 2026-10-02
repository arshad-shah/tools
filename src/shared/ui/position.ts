/**
 * The kit positioner: every floating surface (Tooltip, Popover, HoverCard,
 * DropdownMenu) is placed by @floating-ui so it flips to the other side,
 * shifts and shrinks to stay 8px inside the viewport, tracks its anchor
 * through scrolling and resizing (autoUpdate) and hides when the anchor is
 * scrolled out of its container. Surfaces portal to body with a fixed
 * strategy, so no overflow or transform of an ancestor can clip them.
 */
import { useLayoutEffect, type CSSProperties, type RefObject } from 'react';
import {
  arrow as arrowMiddleware,
  autoUpdate,
  flip,
  hide,
  offset as offsetMiddleware,
  shift,
  size,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';

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

/** Minimum distance between a floating surface and the viewport edge. */
export const VIEWPORT_PADDING = 8;

export const isRefAnchor = (a: Anchor): a is RefObject<HTMLElement | null> =>
  'current' in a;

/** An anchor as given, or an element held in state (a callback ref). */
type AnchorInput = Anchor | Element | null;
const resolveAnchor = (a: AnchorInput) =>
  a === null || a instanceof Element ? a : isRefAnchor(a) ? a.current : a;

/**
 * The @floating-ui placement for a side and alignment. Start and end are
 * logical: in a right-to-left context, start is the right edge.
 */
export function toPlacement(side: Side, align: Align): Placement {
  return align === 'center' ? side : `${side}-${align}`;
}

/** The side of a resolved placement (after any flip). */
export const sideOf = (p: Placement): Side => p.split('-')[0] as Side;

const STATIC_SIDE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

export interface AnchoredFloatingOptions {
  open: boolean;
  anchor: AnchorInput;
  side?: Side;
  align?: Align;
  /** Gap between the anchor and the surface, CSS px. */
  offset?: number;
  /** An arrow element inside the surface, kept pointing at the anchor. */
  arrow?: HTMLElement | null;
}

export interface AnchoredFloating {
  /** Ref callback for the floating surface. */
  setFloating: (el: HTMLElement | null) => void;
  /** Position styles for the surface (hidden until first placed). */
  style: CSSProperties;
  /** Position styles for the arrow element. */
  arrowStyle: CSSProperties;
  /** The side actually used, after flipping. */
  side: Side;
  /** True once the surface has a computed position for this opening. */
  placed: boolean;
}

/** Anchors a floating surface (see the module comment). */
export function useAnchoredFloating({
  open,
  anchor,
  side = 'bottom',
  align = 'center',
  offset = 8,
  arrow,
}: AnchoredFloatingOptions): AnchoredFloating {
  const { refs, floatingStyles, placement, middlewareData, isPositioned } =
    useFloating({
      open,
      strategy: 'fixed',
      // left/top, not a transform: the surface may animate its own transform.
      transform: false,
      placement: toPlacement(side, align),
      whileElementsMounted: autoUpdate,
      middleware: [
        offsetMiddleware(offset),
        flip({ padding: VIEWPORT_PADDING, crossAxis: false }),
        shift({ padding: VIEWPORT_PADDING }),
        size({
          padding: VIEWPORT_PADDING,
          apply({ availableWidth, availableHeight, elements }) {
            // The kit owns this data-driven style: cap the surface to the
            // room left, so a long one wraps or scrolls instead of clipping.
            Object.assign(elements.floating.style, {
              maxWidth: `${Math.max(0, availableWidth)}px`,
              maxHeight: `${Math.max(0, availableHeight)}px`,
            });
          },
        }),
        arrow ? arrowMiddleware({ element: arrow, padding: 6 }) : null,
        // Hidden once the anchor has scrolled fully out of its container.
        // The 1px slack keeps an anchor that merely touches the edge (or a
        // zero-size one at the origin) visible.
        hide({ strategy: 'referenceHidden', padding: -1 }),
      ],
    });

  // Ref anchors resolve after commit; a virtual anchor is used as given.
  useLayoutEffect(() => {
    if (!open) return;
    refs.setReference(resolveAnchor(anchor));
  }, [open, anchor, refs]);

  const resolved = sideOf(placement);
  const hidden = middlewareData.hide?.referenceHidden;
  const a = middlewareData.arrow;
  return {
    setFloating: refs.setFloating,
    style: {
      ...floatingStyles,
      // Before the first placement: transparent and inert, but laid out and
      // focusable (visibility:hidden would block focus).
      opacity: isPositioned ? 1 : 0,
      pointerEvents: isPositioned ? undefined : 'none',
      visibility: hidden ? 'hidden' : undefined,
    },
    arrowStyle: {
      left: a?.x,
      top: a?.y,
      [STATIC_SIDE[resolved]]: -4,
    },
    side: resolved,
    placed: isPositioned,
  };
}
