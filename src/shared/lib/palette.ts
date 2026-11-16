import {
  resolveColors,
  type ColorTokens,
  type PaletteName,
} from '@arshad-shah/cynosure/tokens';
import { toolsTheme } from '@/theme/tools-theme';

/**
 * The palette the page shows now, read from the colour mode on `<html>`
 * (`data-cy-mode`, set by CynosureTheme and theme-init.js) and, for
 * `system` or nothing saved, the OS preference.
 */
export function currentPalette(): PaletteName {
  const mode = document.documentElement.getAttribute('data-cy-mode');
  const dark =
    mode === 'dark' ||
    (mode !== 'light' &&
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-color-scheme: dark)').matches);
  return dark ? 'dark' : 'light';
}

/**
 * The tools theme's colours as concrete values, for files written from the
 * page (exports read on paper and in other apps). `light` gives the light
 * palette whatever the page shows.
 */
export function paletteColors(
  palette: PaletteName | 'current' = 'current',
): ColorTokens {
  return resolveColors(
    toolsTheme,
    palette === 'current' ? currentPalette() : palette,
  );
}

/** `#rrggbb` with an alpha (0 to 1) as `#rrggbbaa`; other values pass through. */
export function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${color}${a.toString(16).padStart(2, '0')}`;
}
