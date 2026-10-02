export * from './stroke';
export { removeWhiteBackground, opaqueBounds } from './pixels';
export {
  MIN_SIZE_PT,
  clampRect,
  defaultRect,
  moveRect,
  scaleRect,
  rectToPixels,
  rectFromPixels,
} from './placement';
export {
  SIGNATURE_FONTS,
  fontById,
  ensureFontFace,
  fetchFontBytes,
  loadSignatureFont,
  inkAspect,
  missingChars,
  type SignatureFont,
  type SignatureFontId,
} from './fonts';
export {
  INK_COLORS,
  canvasToPng,
  type SignatureSource,
  type SignatureSourceProps,
} from './signature';
