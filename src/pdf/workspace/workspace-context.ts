import { createContext, useContext } from 'react';
import type { JobContext } from '@/shared/state/useJob';
import type { WorkspaceSession } from './session';

/** Workspace services for mode UI beyond DocumentApi (new files, jobs). */
export interface WorkspaceActions {
  session: WorkspaceSession;
  /** Runs `fn` behind the workspace ProgressOverlay; null when cancelled. */
  runJob<R>(
    title: string,
    fn: (ctx: JobContext) => Promise<R>,
  ): Promise<R | null>;
  /** Opens new bytes as a separate document (asks first when unsaved). */
  openAsNew(doc: { name: string; bytes: Uint8Array }): void;
}

export const WorkspaceContext = createContext<WorkspaceActions | null>(null);

export function useWorkspace(): WorkspaceActions {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace needs a WorkspaceShell');
  return ctx;
}
