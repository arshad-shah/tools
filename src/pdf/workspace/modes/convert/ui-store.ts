import { useSyncExternalStore } from 'react';

/** Convert actions the command palette can ask the mounted toolbar to run. */
export type ConvertAction =
  | 'images'
  | 'text'
  | 'markdown'
  | 'selected-pdf'
  | 'insert-images';

export interface ConvertRequest {
  action: ConvertAction;
  /** Distinguishes repeated requests for the same action. */
  nonce: number;
}

let request: ConvertRequest | null = null;
let nonce = 0;
const listeners = new Set<() => void>();

export function requestConvert(action: ConvertAction): void {
  request = { action, nonce: ++nonce };
  for (const l of [...listeners]) l();
}

export function useConvertRequest(): ConvertRequest | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => request,
  );
}
