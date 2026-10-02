import { IconModeOcr } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const ocrManifest: ModeManifest = {
  id: 'ocr',
  label: 'OCR',
  icon: IconModeOcr,
  shortcut: shortcutFor('ocr'),
  order: 9,
  load: () => import('./Mode'),
};
