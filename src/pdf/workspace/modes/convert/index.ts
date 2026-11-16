import { fileConvert } from '@arshad-shah/cynosure/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const convertManifest: ModeManifest = {
  id: 'convert',
  label: 'Convert',
  icon: fileConvert,
  shortcut: shortcutFor('convert'),
  order: 6,
  load: () => import('./Mode'),
};
