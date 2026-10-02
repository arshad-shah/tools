/** Pure placement maths for floating surfaces (Popover, Inspector-as-popover). */
export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OPPOSITE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const clamp = (v: number, lo: number, hi: number) =>
  hi < lo ? lo : Math.min(Math.max(v, lo), hi);

function mainAxis(
  anchor: Rect,
  floating: { width: number; height: number },
  side: Side,
  offset: number,
): number {
  switch (side) {
    case 'bottom':
      return anchor.y + anchor.height + offset;
    case 'top':
      return anchor.y - offset - floating.height;
    case 'right':
      return anchor.x + anchor.width + offset;
    case 'left':
      return anchor.x - offset - floating.width;
  }
}

/** How far the floating box spills past the viewport (minus padding) on `side`. */
function overflow(
  pos: number,
  floating: { width: number; height: number },
  viewport: Rect,
  side: Side,
  padding: number,
): number {
  switch (side) {
    case 'bottom':
      return pos + floating.height - (viewport.y + viewport.height - padding);
    case 'top':
      return viewport.y + padding - pos;
    case 'right':
      return pos + floating.width - (viewport.x + viewport.width - padding);
    case 'left':
      return viewport.x + padding - pos;
  }
}

function crossAxis(
  anchor: Rect,
  floating: { width: number; height: number },
  side: Side,
  align: Align,
): number {
  const vertical = side === 'top' || side === 'bottom';
  const start = vertical ? anchor.x : anchor.y;
  const aSize = vertical ? anchor.width : anchor.height;
  const fSize = vertical ? floating.width : floating.height;
  if (align === 'start') return start;
  if (align === 'end') return start + aSize - fSize;
  return start + (aSize - fSize) / 2;
}

/**
 * Places `floating` next to `anchor`. Flips to the opposite side when the
 * preferred side overflows and the opposite overflows less, then shifts
 * along the cross axis to stay `padding` inside the viewport.
 */
export function placeFloating(
  anchor: Rect,
  floating: { width: number; height: number },
  viewport: Rect,
  opts: { side: Side; align: Align; offset: number; padding: number },
): { x: number; y: number; side: Side } {
  let side = opts.side;
  let main = mainAxis(anchor, floating, side, opts.offset);
  const over = overflow(main, floating, viewport, side, opts.padding);
  if (over > 0) {
    const flipped = OPPOSITE[side];
    const flippedMain = mainAxis(anchor, floating, flipped, opts.offset);
    if (
      overflow(flippedMain, floating, viewport, flipped, opts.padding) < over
    ) {
      side = flipped;
      main = flippedMain;
    }
  }
  const vertical = side === 'top' || side === 'bottom';
  const cross = crossAxis(anchor, floating, side, opts.align);
  const lo = (vertical ? viewport.x : viewport.y) + opts.padding;
  const hi =
    (vertical ? viewport.x + viewport.width : viewport.y + viewport.height) -
    opts.padding -
    (vertical ? floating.width : floating.height);
  const c = clamp(cross, lo, hi);
  return vertical ? { x: c, y: main, side } : { x: main, y: c, side };
}

export interface FloatingLayout {
  x: number;
  y: number;
  side: Side;
  /** Room on the chosen side, so the surface can wrap or scroll instead of clipping. */
  maxWidth: number;
  maxHeight: number;
  /**
   * Where an arrow sits along the surface's cross axis (px from its left or
   * top edge): under the anchor's centre, kept `arrowPadding` from the
   * corners. Follows the anchor after a shift.
   */
  arrow: number;
}

/**
 * `placeFloating` plus what a positioned surface needs to stay whole: the
 * space available on the chosen side and the arrow offset. With `rtl`,
 * start and end alignment mirror on the top and bottom sides.
 */
export function layoutFloating(
  anchor: Rect,
  floating: { width: number; height: number },
  viewport: Rect,
  opts: {
    side: Side;
    align: Align;
    offset: number;
    padding: number;
    rtl?: boolean;
    arrowPadding?: number;
  },
): FloatingLayout {
  const vertical0 = opts.side === 'top' || opts.side === 'bottom';
  const align: Align =
    opts.rtl && vertical0 && opts.align !== 'center'
      ? opts.align === 'start'
        ? 'end'
        : 'start'
      : opts.align;
  const placed = placeFloating(anchor, floating, viewport, { ...opts, align });
  const { side } = placed;
  const vertical = side === 'top' || side === 'bottom';
  const p = opts.padding;
  const room: Record<Side, number> = {
    top: anchor.y - opts.offset - (viewport.y + p),
    bottom:
      viewport.y +
      viewport.height -
      p -
      (anchor.y + anchor.height + opts.offset),
    left: anchor.x - opts.offset - (viewport.x + p),
    right:
      viewport.x + viewport.width - p - (anchor.x + anchor.width + opts.offset),
  };
  const maxWidth = Math.max(0, vertical ? viewport.width - 2 * p : room[side]);
  const maxHeight = Math.max(
    0,
    vertical ? room[side] : viewport.height - 2 * p,
  );
  const size = vertical ? floating.width : floating.height;
  const centre = vertical
    ? anchor.x + anchor.width / 2 - placed.x
    : anchor.y + anchor.height / 2 - placed.y;
  const pad = Math.min(opts.arrowPadding ?? 8, size / 2);
  return {
    ...placed,
    maxWidth,
    maxHeight,
    arrow: clamp(centre, pad, size - pad),
  };
}
