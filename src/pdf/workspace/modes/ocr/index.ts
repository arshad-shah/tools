import { fileScan } from '@arshad-shah/cynosure/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const ocrManifest: ModeManifest = {
  id: 'ocr',
  label: 'OCR',
  icon: fileScan,
  shortcut: shortcutFor('ocr'),
  order: 9,
  load: () => import('./Mode'),
};
