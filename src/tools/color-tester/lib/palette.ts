import { ColorInfo } from '../types';

export const INITIAL_PALETTE: ColorInfo[] = [
  {
    red: 255,
    green: 105,
    blue: 180,
    alpha: 1,
    hex: '#ff69b4',
    rgb: 'rgb(255, 105, 180)',
    name: 'Hot Pink',
  },
  {
    red: 102,
    green: 205,
    blue: 170,
    alpha: 1,
    hex: '#66cdaa',
    rgb: 'rgb(102, 205, 170)',
    name: 'Medium Aquamarine',
  },
  {
    red: 65,
    green: 105,
    blue: 225,
    alpha: 1,
    hex: '#4169e1',
    rgb: 'rgb(65, 105, 225)',
    name: 'Royal Blue',
  },
  {
    red: 255,
    green: 165,
    blue: 0,
    alpha: 1,
    hex: '#ffa500',
    rgb: 'rgb(255, 165, 0)',
    name: 'Orange',
  },
  {
    red: 75,
    green: 0,
    blue: 130,
    alpha: 1,
    hex: '#4b0082',
    rgb: 'rgb(75, 0, 130)',
    name: 'Indigo',
  },
  {
    red: 60,
    green: 179,
    blue: 113,
    alpha: 1,
    hex: '#3cb371',
    rgb: 'rgb(60, 179, 113)',
    name: 'Medium Sea Green',
  },
];

/** `#rrggbb` from 0-255 channels. */
export const toHex = (red: number, green: number, blue: number): string =>
  `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;

/** `rgb(...)`, or `rgba(...)` when the colour is translucent. */
export const toRgbString = (
  red: number,
  green: number,
  blue: number,
  alpha: number,
): string =>
  alpha < 1
    ? `rgba(${red}, ${green}, ${blue}, ${alpha})`
    : `rgb(${red}, ${green}, ${blue})`;

/** Perceived brightness, 0-1. */
export const luminance = (red: number, green: number, blue: number): number =>
  (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

/** Dark or white text, whichever reads better on the colour. */
export const textColorFor = (red: number, green: number, blue: number) =>
  luminance(red, green, blue) > 0.5 ? '#1a202c' : '#ffffff';

/** Channels of an `rgb(r, g, b)` string, or null if it is not one. */
export const parseRgb = (
  rgb: string,
): { r: number; g: number; b: number } | null => {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
  };
};

export const wcagLevel = (
  ratio: number,
): { label: string; colorScheme: 'success' | 'warning' | 'danger' } => {
  if (ratio >= 7) return { label: 'AAA', colorScheme: 'success' };
  if (ratio >= 4.5) return { label: 'AA', colorScheme: 'success' };
  if (ratio >= 3) return { label: 'AA Large', colorScheme: 'warning' };
  return { label: 'Fail', colorScheme: 'danger' };
};
