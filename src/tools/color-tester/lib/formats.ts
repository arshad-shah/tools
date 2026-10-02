import {
  nearestNamed,
  type Color,
  type ColorFormat,
} from '@/shared/lib/colour';

export const FORMATS: { fmt: ColorFormat; label: string }[] = [
  { fmt: 'hex', label: 'Hex' },
  { fmt: 'rgb', label: 'RGB' },
  { fmt: 'hsl', label: 'HSL' },
  { fmt: 'hwb', label: 'HWB' },
  { fmt: 'lab', label: 'Lab' },
  { fmt: 'lch', label: 'LCH' },
  { fmt: 'oklab', label: 'OKLab' },
  { fmt: 'oklch', label: 'OKLCH' },
];

/** OKLab distance under which a colour counts as the named one itself. */
const EXACT = 0.002;

export function namedText(color: Color): string {
  const { name, distance } = nearestNamed(color);
  return distance < EXACT ? `${name} (exact match)` : `close to ${name}`;
}
