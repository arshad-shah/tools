import { IconModeOrganize } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const organizeManifest: ModeManifest = {
  id: 'organize',
  label: 'Organize',
  icon: IconModeOrganize,
  shortcut: shortcutFor('organize'),
  order: 1,
  load: () => import('./Mode'),
};
