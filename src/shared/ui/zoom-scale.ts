import type { ZoomSetting } from './document-viewport';
import { clampPercent } from './use-viewport-gestures';

/** Scale for a zoom setting; fit modes need a measured viewport. */
export function zoomScale(
  zoom: ZoomSetting,
  pages: { width: number; height: number }[],
  clientWidth: number,
  clientHeight: number,
  gap: number,
): number {
  if (zoom.kind === 'percent') return clampPercent(zoom.value) / 100;
  const maxW = Math.max(1, ...pages.map((p) => p.width));
  const maxH = Math.max(1, ...pages.map((p) => p.height));
  if (clientWidth <= 0) return 1;
  const cap = zoom.max ? clampPercent(zoom.max) / 100 : Infinity;
  const fitWidth = (clientWidth - 2 * gap) / maxW;
  if (zoom.kind === 'fit-width' || clientHeight <= 0)
    return Math.max(0.01, Math.min(cap, fitWidth));
  return Math.max(
    0.01,
    Math.min(cap, fitWidth, (clientHeight - 2 * gap) / maxH),
  );
}
