import type { CodeImageBackdrop } from '@/shared/surfaces/code-image/style';

/** Gradient presets for the space around the window (image content). */
export interface GradientPreset {
  id: string;
  label: string;
  angle: number;
  stops: readonly string[];
}

export const GRADIENTS: readonly GradientPreset[] = [
  { id: 'lagoon', label: 'Lagoon', angle: 135, stops: ['#43cea2', '#185a9d'] },
  { id: 'sunset', label: 'Sunset', angle: 135, stops: ['#f6d365', '#fd8a6b'] },
  { id: 'aurora', label: 'Aurora', angle: 120, stops: ['#5ee7df', '#9f7fd6'] },
  { id: 'dusk', label: 'Dusk', angle: 160, stops: ['#2b5876', '#4e4376'] },
  { id: 'peach', label: 'Peach', angle: 135, stops: ['#ffecd2', '#fcb69f'] },
  { id: 'slate', label: 'Slate', angle: 180, stops: ['#4a525e', '#1d2127'] },
];

export type BackgroundKind = 'gradient' | 'solid' | 'transparent';

export const DEFAULT_GRADIENT = 'lagoon';
export const DEFAULT_SOLID = '#e9e4da';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** A colour safe to put in the image (and in SVG): a hex value. */
export const isHexColor = (v: string) => HEX.test(v);

/** The backdrop for the chosen background. */
export function backdropFor(
  kind: BackgroundKind,
  gradient: string,
  solid: string,
): CodeImageBackdrop {
  if (kind === 'transparent') return { kind: 'transparent' };
  if (kind === 'solid')
    return { kind: 'solid', color: isHexColor(solid) ? solid : DEFAULT_SOLID };
  const g =
    GRADIENTS.find((x) => x.id === gradient) ??
    (GRADIENTS.find((x) => x.id === DEFAULT_GRADIENT) as GradientPreset);
  return { kind: 'gradient', angle: g.angle, stops: g.stops };
}
