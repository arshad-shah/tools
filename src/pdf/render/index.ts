export { pdfRender, type PdfRender } from './client';
export {
  bitmapCache,
  purgeDocBitmaps,
  usePdfDocument,
  usePageBitmap,
} from './hooks';
export { textFromItems } from './text';
export type { PageBitmap } from './bitmap-state';
export type { PageTextItems, TextItemGeom } from './handlers/text';
export type { Priority } from './priority';
export type {
  DocInfo,
  ImageFormat,
  PageImage,
  PageImageOptions,
  PageInfo,
  PageText,
} from './types';
export {
  exportScale,
  MAX_CANVAS_PIXELS,
  MAX_EXPORT_DPI,
  MIN_EXPORT_DPI,
} from './render-scale';
