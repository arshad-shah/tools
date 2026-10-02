import { useSyncExternalStore } from 'react';
import type { ToolError } from '@/shared/lib/errors';
import type { OcrLanguage, OcrManifest } from '@/pdf/ocr/types';

/** Which pages a run covers: without text, every page, or the selection. */
export type OcrPagesChoice = 'auto' | 'force' | 'selected';

/** OCR mode state shared by the toolbar, inspector and commands. */
export interface OcrUi {
  langs: OcrLanguage[];
  pages: OcrPagesChoice;
  /** "Not now" folds the consent card until the next Run OCR. */
  dismissed: boolean;
  /** Every chosen language stored on this device; null while checking. */
  cached: boolean | null;
  /** Sizes for the consent line (a small same-origin file, no OCR data). */
  manifest: OcrManifest | null;
  /** The last failed run, shown with "Try again" until the next run. */
  error: ToolError | null;
  running: boolean;
}

const INITIAL: OcrUi = {
  langs: ['eng'],
  pages: 'auto',
  dismissed: false,
  cached: null,
  manifest: null,
  error: null,
  running: false,
};

let state: OcrUi = INITIAL;
const listeners = new Set<() => void>();

export function setOcrUi(patch: Partial<OcrUi>): void {
  state = { ...state, ...patch };
  for (const l of [...listeners]) l();
}

export const getOcrUi = () => state;

export function useOcrUi(): OcrUi {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
