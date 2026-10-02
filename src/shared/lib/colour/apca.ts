import { composite } from './contrast';
import type { Color } from './convert';

/**
 * APCA lightness contrast Lc, version 0.0.98G-4g (the constants of
 * apca-w3 0.1.9). Positive for dark text on a light background, negative
 * for light text on dark. A translucent `text` is composited over `bg`.
 */
const MAIN_TRC = 2.4;
const R = 0.2126729;
const G = 0.7151522;
const B = 0.072175;
const NORM_BG = 0.56;
const NORM_TXT = 0.57;
const REV_TXT = 0.62;
const REV_BG = 0.65;
const BLK_THRS = 0.022;
const BLK_CLMP = 1.414;
const SCALE = 1.14;
const LO_OFFSET = 0.027;
const LO_CLIP = 0.1;
const DELTA_Y_MIN = 0.0005;

function screenY(c: Color): number {
  const y = R * c.r ** MAIN_TRC + G * c.g ** MAIN_TRC + B * c.b ** MAIN_TRC;
  return y > BLK_THRS ? y : y + (BLK_THRS - y) ** BLK_CLMP;
}

export function apcaLc(text: Color, bg: Color): number {
  const back = composite(bg, { r: 1, g: 1, b: 1, alpha: 1 });
  const yTxt = screenY(composite(text, back));
  const yBg = screenY(back);
  if (Math.abs(yBg - yTxt) < DELTA_Y_MIN) return 0;
  if (yBg > yTxt) {
    const sapc = (yBg ** NORM_BG - yTxt ** NORM_TXT) * SCALE;
    return sapc < LO_CLIP ? 0 : (sapc - LO_OFFSET) * 100;
  }
  const sapc = (yBg ** REV_BG - yTxt ** REV_TXT) * SCALE;
  return sapc > -LO_CLIP ? 0 : (sapc + LO_OFFSET) * 100;
}
