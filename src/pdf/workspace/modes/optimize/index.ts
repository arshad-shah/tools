import { fileCompress } from '@arshad-shah/cynosure/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const optimizeManifest: ModeManifest = {
  id: 'optimize',
  label: 'Optimize',
  icon: fileCompress,
  shortcut: shortcutFor('optimize'),
  order: 8,
  load: () => import('./Mode'),
};
