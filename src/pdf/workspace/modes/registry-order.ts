import { MODE_ORDER } from '@/pdf/doc/modes';
import type { ModeId } from '@/pdf/doc/types';

export { MODE_ORDER };

/** Shortcuts 1-9 follow the fixed spec order, whichever modes exist. */
export function shortcutFor(id: ModeId): string {
  return String(MODE_ORDER.indexOf(id) + 1);
}
