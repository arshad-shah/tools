import { IconModeEdit } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const editManifest: ModeManifest = {
  id: 'edit',
  label: 'Edit',
  icon: IconModeEdit,
  shortcut: shortcutFor('edit'),
  order: 2,
  load: () => import('./Mode'),
};
