import { IconModeOptimize } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const optimizeManifest: ModeManifest = {
  id: 'optimize',
  label: 'Optimize',
  icon: IconModeOptimize,
  shortcut: shortcutFor('optimize'),
  order: 8,
  load: () => import('./Mode'),
};
