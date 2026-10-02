import type { Command } from '@/shared/lib/commands';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { IconCertificate } from '@/shared/ui/icons';
import { clearTrustedRoots } from '@/pdf/sign/pades/trust';
import { trustedRootsChanged } from '../../signatures';
import { getWorkspaceDb } from '../../workspace-db';

export const CLEAR_TRUSTED_ROOTS = 'Clear trusted roots';

/**
 * Settings: forget every imported root certificate (plan H-14). The
 * workspace has no settings menu in the standard layout, so this lives in
 * Mod+K under Settings; the Trusted roots dialog also has "Clear all".
 */
export function clearTrustedRootsCommand(): Command {
  return {
    id: 'settings-clear-trusted-roots',
    label: CLEAR_TRUSTED_ROOTS,
    group: 'Settings',
    keywords: ['certificate', 'signature', 'trust'],
    icon: IconCertificate,
    async run() {
      try {
        const db = await getWorkspaceDb();
        if (db) await clearTrustedRoots(db);
        trustedRootsChanged();
        notify.success('Trusted roots cleared');
      } catch (e) {
        notify.error(toToolError(e));
      }
    },
  };
}
