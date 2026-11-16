import { filePen } from '@arshad-shah/cynosure/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const editManifest: ModeManifest = {
  id: 'edit',
  label: 'Edit',
  icon: filePen,
  shortcut: shortcutFor('edit'),
  order: 2,
  load: () => import('./Mode'),
};
