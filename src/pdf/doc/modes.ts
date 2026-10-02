import type { ModeId } from './types';

/** Fixed mode order (spec §7; shortcuts 1-9 follow it, decision G7). */
export const MODE_ORDER: readonly ModeId[] = [
  'organize',
  'edit',
  'annotate',
  'fill-sign',
  'redact',
  'convert',
  'protect',
  'optimize',
  'ocr',
];

/** Display names (the export summary names modes even before their Part ships). */
export const MODE_LABELS: Record<ModeId, string> = {
  organize: 'Organize',
  edit: 'Edit',
  annotate: 'Annotate',
  'fill-sign': 'Fill & Sign',
  redact: 'Redact',
  convert: 'Convert',
  protect: 'Protect',
  optimize: 'Optimize',
  ocr: 'OCR',
};
