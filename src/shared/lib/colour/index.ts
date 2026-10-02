/**
 * Colour engine (spec §4.7, ruling R30): parsing and formatting CSS colours,
 * conversions, WCAG and APCA contrast, CVD simulation, OKLCH scales and
 * named colours. Pure and worker-safe.
 */
export {
  clip,
  deltaEOk,
  fromOklch,
  gamutMap,
  inGamut,
  luminance,
  toOklab,
  toOklch,
  type Color,
  type Oklch,
} from './convert';
export { formatColor, parseColor, type ColorFormat } from './parse';
export {
  composite,
  contrastRatio,
  suggestPassing,
  wcagLevels,
  type WcagLevels,
} from './contrast';
export { apcaLc } from './apca';
export { simulateCvd, type CvdType } from './cvd';
export { DEFAULT_STEPS, scale, type ScaleOptions } from './scale';
export { NAMED_COLOURS, nearestNamed } from './names';
