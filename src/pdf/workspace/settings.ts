import { createToolStore } from '@/shared/state/createToolStore';
import type { ZoomSetting } from '@/shared/ui';
import type { ModeId } from '@/pdf/doc/types';

/** Workspace layout preferences (spec §6.1): settings only, never documents. */
export interface WorkspaceSettings {
  layout: 'standard' | 'focus';
  railWidth: number;
  railOpen: boolean;
  zoom: ZoomSetting;
  lastMode: ModeId;
  palette: 'left' | 'right';
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  layout: 'standard',
  railWidth: 180,
  railOpen: true,
  zoom: { kind: 'fit-width' },
  lastMode: 'organize',
  palette: 'left',
};

export const useWorkspaceSettings = createToolStore<WorkspaceSettings>({
  toolId: 'pdf-edit',
  initial: DEFAULT_WORKSPACE_SETTINGS,
});
