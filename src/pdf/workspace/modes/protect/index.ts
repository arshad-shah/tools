import { fileLock } from '@arshad-shah/cynosure/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const protectManifest: ModeManifest = {
  id: 'protect',
  label: 'Protect',
  icon: fileLock,
  shortcut: shortcutFor('protect'),
  order: 7,
  load: () => import('./Mode'),
};
