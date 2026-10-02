import { useSyncExternalStore } from 'react';
import type { ToolError } from '@/shared/lib/errors';

/** Redact mode settings and panels, shared by the toolbar, overlay and inspector. */
export interface RedactUi {
  /** #rrggbb */
  fill: string;
  overlayText: string;
  /** Resolution of pages turned into images. */
  dpi: 150 | 200 | 300;
  snap: boolean;
  searchOpen: boolean;
  confirmOpen: boolean;
  /** A refused apply (VERIFICATION_FAILED): shown until closed. */
  failure: ToolError | null;
}

const INITIAL: RedactUi = {
  fill: '#000000',
  overlayText: '',
  dpi: 200,
  snap: false,
  searchOpen: false,
  confirmOpen: false,
  failure: null,
};

let state: RedactUi = INITIAL;
const listeners = new Set<() => void>();

export function setRedactUi(patch: Partial<RedactUi>): void {
  state = { ...state, ...patch };
  for (const l of [...listeners]) l();
}

export const getRedactUi = () => state;

export function useRedactUi(): RedactUi {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
