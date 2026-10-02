import { useEffect } from 'react';
import type { DocumentApi } from './modes/types';

declare global {
  interface Window {
    /** Dev builds only: e2e fidelity tests dispatch ops directly (plan D-10). */
    __workspaceTest?: {
      dispatch: DocumentApi['dispatch'];
      pageIds(): string[];
      addAsset: DocumentApi['addAsset'];
    };
  }
}

/** Exposes dispatch to e2e tests in development builds; absent in production. */
export function useWorkspaceTestHook(doc: DocumentApi): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__workspaceTest = {
      dispatch: (op, label) => doc.dispatch(op, label),
      pageIds: () => doc.view.pages.map((p) => p.id),
      addAsset: (bytes, mime) => doc.addAsset(bytes, mime),
    };
    return () => {
      delete window.__workspaceTest;
    };
  }, [doc]);
}
