export interface RingTheme {
  /** The unfilled track. */
  track: string;
  /** The elapsed part. */
  fill: string;
}

export const RING_SIZE = 64;

/** Paints the ring for `progress` (clamped to 0 to 1) on a square canvas. */
export function paintRing(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: RingTheme,
  size = RING_SIZE,
): void {
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const c = size / 2;
  const r = size / 2 - 8;
  ctx.clearRect(0, 0, size, size);
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.strokeStyle = theme.track;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
  if (p > 0) {
    ctx.strokeStyle = theme.fill;
    ctx.beginPath();
    ctx.arc(c, c, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * A progress ring for the tab icon (spec §8.6) as a PNG data URL, painted
 * by `render` (the kit's `renderFaviconImage`). Colours come from the
 * caller's theme tokens.
 */
export function drawFaviconRing(
  progress: number,
  theme: RingTheme,
  render: (
    size: number,
    paint: (ctx: CanvasRenderingContext2D) => void,
  ) => string,
): string {
  return render(RING_SIZE, (ctx) => paintRing(ctx, progress, theme));
}
