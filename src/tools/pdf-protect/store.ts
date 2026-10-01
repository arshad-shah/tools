import { createToolStore } from '@/shared/state/createToolStore';
import { DEFAULT_PERMISSIONS, type PermissionChoices } from './lib/permissions';

/** Permission choices only. Passwords are never stored. */
export const usePermissionSettings = createToolStore({
  toolId: 'pdf-protect',
  initial: { ...DEFAULT_PERMISSIONS },
  actions: (set) => ({
    setPermissions: (patch: Partial<PermissionChoices>) => set(patch),
  }),
});
