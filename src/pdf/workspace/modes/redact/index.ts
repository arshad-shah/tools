import { fileRedact } from '@arshad-shah/cynosure/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const redactManifest: ModeManifest = {
  id: 'redact',
  label: 'Redact',
  icon: fileRedact,
  shortcut: shortcutFor('redact'),
  order: 5,
  load: () => import('./Mode'),
};
