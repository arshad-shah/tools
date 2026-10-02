import React from 'react';
import {
  layoutFloating,
  type Align,
  type FloatingLayout,
  type Side,
} from './position';

export type VirtualAnchor = { getBoundingClientRect(): DOMRect };
export type FloatingAnchor =
  | React.RefObject<HTMLElement | null>
  | VirtualAnchor;

export const isAnchorRef = (
  a: FloatingAnchor,
): a is React.RefObject<HTMLElement | null> => 'current' in a;

export interface UseFloatingOptions {
  open: boolean;
  anchor: FloatingAnchor;
  side?: Side;
  align?: Align;
  offset?: number;
  /** Distance kept from every viewport edge. Default 8. */
  padding?: number;
}

/** The viewport without its scrollbars (what a fixed surface can use). */
function viewportRect() {
  const root = document.documentElement;
  return {
    x: 0,
    y: 0,
    width: root.clientWidth || window.innerWidth,
    height: root.clientHeight || window.innerHeight,
  };
}

/**
 * Positions a fixed, portalled surface against an anchor (spec §4.6) with
 * collision handling: flip when the preferred side has no room, shift to
 * stay `padding` inside the viewport, cap the size to the room left, and
 * report the arrow offset. Re-measures on resize, on scroll in any
 * container (capture) and when the surface or anchor changes size, so it
 * follows triggers inside scrolling toolbars and rails. RTL mirrors
 * start/end alignment.
 */
export function useFloating<T extends HTMLElement = HTMLDivElement>({
  open,
  anchor,
  side = 'bottom',
  align = 'center',
  offset = 8,
  padding = 8,
}: UseFloatingOptions) {
  const ref = React.useRef<T>(null);
  const [layout, setLayout] = React.useState<FloatingLayout | null>(null);

  const measure = React.useCallback(() => {
    const el = ref.current;
    const a = isAnchorRef(anchor)
      ? anchor.current?.getBoundingClientRect()
      : anchor.getBoundingClientRect();
    if (!el || !a) return;
    const dirEl = isAnchorRef(anchor) ? anchor.current : null;
    const rtl =
      getComputedStyle(dirEl ?? document.documentElement).direction === 'rtl';
    const next = layoutFloating(
      { x: a.left, y: a.top, width: a.width, height: a.height },
      { width: el.offsetWidth, height: el.offsetHeight },
      viewportRect(),
      { side, align, offset, padding, rtl },
    );
    setLayout((prev) =>
      prev &&
      prev.x === next.x &&
      prev.y === next.y &&
      prev.side === next.side &&
      prev.maxWidth === next.maxWidth &&
      prev.maxHeight === next.maxHeight &&
      prev.arrow === next.arrow
        ? prev
        : next,
    );
  }, [anchor, side, align, offset, padding]);

  React.useLayoutEffect(() => {
    if (!open) return;
    measure();
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null;
    if (ref.current) ro?.observe(ref.current);
    if (isAnchorRef(anchor) && anchor.current) ro?.observe(anchor.current);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure, anchor]);

  // Closing forgets the position, so the next open measures afresh.
  React.useLayoutEffect(() => {
    if (!open) return;
    return () => setLayout(null);
  }, [open]);

  const style: React.CSSProperties = {
    left: layout?.x ?? 0,
    top: layout?.y ?? 0,
    maxWidth: layout?.maxWidth,
    maxHeight: layout?.maxHeight,
    // Before the first measurement: transparent and inert, but still in
    // the layout and focusable (visibility:hidden would block focus).
    opacity: layout ? 1 : 0,
    pointerEvents: layout ? undefined : 'none',
  };
  return { ref, layout, style, measure };
}
