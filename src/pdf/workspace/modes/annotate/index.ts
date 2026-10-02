import { IconModeAnnotate } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const annotateManifest: ModeManifest = {
  id: 'annotate',
  label: 'Annotate',
  icon: IconModeAnnotate,
  shortcut: shortcutFor('annotate'),
  order: 3,
  load: () => import('./Mode'),
};
