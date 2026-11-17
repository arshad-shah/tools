import type { IconData } from '@arshad-shah/cynosure/icons';
import {
  edit,
  fileCompress,
  fileConvert,
  filePen,
  grid,
  highlighter,
  ocrScan,
  redactArea,
  shieldCheck,
  signatureDraw,
} from '@arshad-shah/cynosure/icons';

/*
 * Facet icons for the PDF workspace modes, by id (the PDF hub lists them).
 * Tools and categories carry their own icon (manifest and CATEGORIES).
 */
const MODE_GLYPHS: Record<string, IconData> = {
  organize: grid,
  edit,
  annotate: highlighter,
  'fill-sign': signatureDraw,
  redact: redactArea,
  convert: fileConvert,
  protect: shieldCheck,
  optimize: fileCompress,
  ocr: ocrScan,
};

export const modeGlyph = (id: string): IconData => MODE_GLYPHS[id] ?? filePen;
