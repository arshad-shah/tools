/**
 * Pan and zoom arithmetic. A frame is the visible domain plus the plot box,
 * so successive wheel or pointer events can chain without waiting for a
 * re-render.
 */
import type { Model, Rect } from './model';
import type { ChartView } from './types';

type Range = [number, number];

export interface Frame {
  view: ChartView;
  plot: Rect;
  fullX: Range;
}

export const frameOf = (m: Model): Frame => ({
  view: { x: [m.xs.d0, m.xs.d1], y: [m.ys.d0, m.ys.d1] },
  plot: m.plot,
  fullX: m.fullX,
});

/** Scales `[a, b]` by `factor` about `c` (factor below 1 zooms in). */
export function zoomRange([a, b]: Range, c: number, factor: number): Range {
  return [c - (c - a) * factor, c + (b - c) * factor];
}

const dataX = (f: Frame, px: number) =>
  f.view.x[0] + ((px - f.plot.x) / f.plot.w) * (f.view.x[1] - f.view.x[0]);
// y grows upwards: the plot bottom is view.y[0].
const dataY = (f: Frame, py: number) =>
  f.view.y[0] +
  ((f.plot.y + f.plot.h - py) / f.plot.h) * (f.view.y[1] - f.view.y[0]);

/** Zooms both axes about a point in CSS px, within sane limits. */
export function zoomAt(
  f: Frame,
  px: number,
  py: number,
  factor: number,
): ChartView {
  const fullW = f.fullX[1] - f.fullX[0] || 1;
  const w = f.view.x[1] - f.view.x[0] || 1;
  // Never closer than a millionth of the data, nor wider than 100 times it.
  const k = Math.min(Math.max(factor, (fullW * 1e-6) / w), (fullW * 100) / w);
  return {
    x: zoomRange(f.view.x, dataX(f, px), k),
    y: zoomRange(f.view.y, dataY(f, py), k),
  };
}

/** Pans by a CSS px delta (the content follows the pointer). */
export function panBy(f: Frame, dx: number, dy: number): ChartView {
  const sx = (dx / f.plot.w) * (f.view.x[1] - f.view.x[0]);
  const sy = (dy / f.plot.h) * (f.view.y[1] - f.view.y[0]);
  return {
    x: [f.view.x[0] - sx, f.view.x[1] - sx],
    y: [f.view.y[0] + sy, f.view.y[1] + sy],
  };
}

/**
 * Keyboard: plus or equals zooms in, minus zooms out, 0 resets (null),
 * arrows pan by a tenth. Undefined for any other key.
 */
export function keyView(f: Frame, key: string): ChartView | null | undefined {
  const cx = f.plot.x + f.plot.w / 2;
  const cy = f.plot.y + f.plot.h / 2;
  switch (key) {
    case '+':
    case '=':
      return zoomAt(f, cx, cy, 0.8);
    case '-':
    case '_':
      return zoomAt(f, cx, cy, 1.25);
    case '0':
      return null;
    case 'ArrowLeft':
      return panBy(f, f.plot.w * 0.1, 0);
    case 'ArrowRight':
      return panBy(f, -f.plot.w * 0.1, 0);
    case 'ArrowUp':
      return panBy(f, 0, f.plot.h * 0.1);
    case 'ArrowDown':
      return panBy(f, 0, -f.plot.h * 0.1);
    default:
      return undefined;
  }
}
