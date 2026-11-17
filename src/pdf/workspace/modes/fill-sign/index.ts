import { fileSignature } from '@arshad-shah/cynosure/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const fillSignManifest: ModeManifest = {
  id: 'fill-sign',
  label: 'Fill & Sign',
  icon: fileSignature,
  shortcut: shortcutFor('fill-sign'),
  order: 4,
  load: () => import('./Mode'),
};
