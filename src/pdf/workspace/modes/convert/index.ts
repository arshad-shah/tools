import { IconModeConvert } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const convertManifest: ModeManifest = {
  id: 'convert',
  label: 'Convert',
  icon: IconModeConvert,
  shortcut: shortcutFor('convert'),
  order: 6,
  load: () => import('./Mode'),
};
