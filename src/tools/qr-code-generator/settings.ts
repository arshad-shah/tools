import { createToolSettings } from '@/shared/lib/tool-settings';
import type { EccLevel } from './lib/render';

export type QrSettings = {
  fg: string;
  bg: string;
  ecc: EccLevel;
  /** Quiet zone on (4 modules) or off. */
  margin: boolean;
  /** Preview size in px. */
  size: number;
  renderAs: 'svg' | 'canvas';
  /** Share of the area a logo covers; the logo itself is never stored. */
  logoFraction: number;
  excavate: boolean;
  /** PNG export size preset id. */
  exportPreset: string;
  /** Print size in mm for the 300 dpi preset. */
  printMm: number;
};

export const QR_DEFAULTS: QrSettings = {
  fg: '#000000',
  bg: '#FFFFFF',
  ecc: 'M',
  margin: true,
  size: 256,
  renderAs: 'svg',
  logoFraction: 0.1,
  excavate: true,
  exportPreset: '1024',
  printMm: 30,
};

export const qrSettings = createToolSettings('qr-code-generator', QR_DEFAULTS, {
  version: 1,
});
