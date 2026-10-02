import { IconModeFillSign } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const fillSignManifest: ModeManifest = {
  id: 'fill-sign',
  label: 'Fill & Sign',
  icon: IconModeFillSign,
  shortcut: shortcutFor('fill-sign'),
  order: 4,
  load: () => import('./Mode'),
};
