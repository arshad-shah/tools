import { IconModeProtect } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const protectManifest: ModeManifest = {
  id: 'protect',
  label: 'Protect',
  icon: IconModeProtect,
  shortcut: shortcutFor('protect'),
  order: 7,
  load: () => import('./Mode'),
};
