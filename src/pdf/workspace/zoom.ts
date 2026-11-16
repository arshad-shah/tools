import type { ZoomSetting } from '@arshad-shah/cynosure';

/** Zoom percent limits (Cynosure's ZoomControls range). */
const MIN_PERCENT = 25;
const MAX_PERCENT = 800;
const clampPercent = (p: number) =>
  Math.round(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, p)));

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

/**
 * The workspace default (P5-G): fit the page width, but never past 125
 * percent, so a wide screen does not open a letter page at 200 percent.
 */
export const DEFAULT_ZOOM = { kind: 'fit-width', max: 125 } as const;

const isDefault = (z: ZoomSetting) =>
  z.kind === 'fit-width' && z.max === DEFAULT_ZOOM.max;

/**
 * The zoom the canvas uses. The default fits the whole page when both the
 * rail and the inspector take room beside it; a zoom the user chose stays.
 */
export function effectiveZoom(
  zoom: ZoomSetting,
  panels: { railOpen: boolean; inspectorOpen: boolean },
): ZoomSetting {
  if (isDefault(zoom) && panels.railOpen && panels.inspectorOpen)
    return { kind: 'fit-page', max: DEFAULT_ZOOM.max };
  return zoom;
}

/** Saved settings from before the cap: the old default becomes the new one. */
export function migrateZoom(zoom: ZoomSetting | undefined): ZoomSetting {
  if (!zoom || (zoom.kind === 'fit-width' && zoom.max === undefined))
    return DEFAULT_ZOOM;
  return zoom;
}

/** Zoom steps in percent (spec §14 render steps, extended to the 25..800 range). */
export const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200, 300, 400, 600, 800];

/** The next step above (dir 1) or below (dir -1) the current scale. */
export function nextZoom(scale: number, dir: 1 | -1): ZoomSetting {
  const percent = Math.round(scale * 100);
  const steps = dir > 0 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse();
  const next =
    steps.find((s) => (dir > 0 ? s > percent : s < percent)) ??
    steps[steps.length - 1];
  return { kind: 'percent', value: next };
}
