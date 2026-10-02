import type { ZoomSetting } from '@/shared/ui';

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
