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
