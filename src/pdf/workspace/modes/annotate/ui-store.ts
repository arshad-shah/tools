import { useSyncExternalStore } from 'react';
import type { StampPreset } from '@/pdf/doc/ops/annotate-params';

/** Ink presets (plan D-5). */
export const INKS = [
  { value: '#ffd400', label: 'Yellow' },
  { value: '#5fd068', label: 'Green' },
  { value: '#4aa8ff', label: 'Blue' },
  { value: '#ff6fb5', label: 'Pink' },
  { value: '#ff4d4d', label: 'Red' },
  { value: '#a78bfa', label: 'Purple' },
];

export const WIDTHS = [
  { value: '1', label: 'Thin' },
  { value: '2', label: 'Medium' },
  { value: '4', label: 'Bold' },
] as const;

/** An open text editor for a note, a reply, a text comment or an edit. */
export type EditorState =
  | { kind: 'note'; pageId: string; at: [number, number] }
  | {
      kind: 'reply';
      pageId: string;
      at: [number, number];
      replyTo:
        | { kind: 'pending'; id: string }
        | { kind: 'existing'; ref: string };
    }
  | {
      kind: 'freetext';
      pageId: string;
      rect: { x: number; y: number; width: number; height: number };
    }
  | {
      kind: 'edit';
      pageId: string;
      at: [number, number];
      target:
        | { kind: 'pending'; id: string }
        | { kind: 'existing'; ref: string; nm: string | null; index: number };
      text: string;
    };

export interface AnnotateUi {
  color: string;
  opacity: number;
  width: number;
  hideExisting: boolean;
  stamp: StampPreset | null;
  /** An image stamp waiting to be placed. */
  imageStamp: {
    assetId: string;
    mime: 'image/png' | 'image/jpeg';
    aspect: number;
  } | null;
  /** The existing annotation (pdf.js id) selected on the canvas or in the panel. */
  selectedExisting: { pageId: string; ref: string; index: number } | null;
  editor: EditorState | null;
  /** "No text here" hint per page id, after a selection without text. */
  noTextPage: string | null;
}

let state: AnnotateUi = {
  color: INKS[0].value,
  opacity: 1,
  width: 2,
  hideExisting: false,
  stamp: 'Approved',
  imageStamp: null,
  selectedExisting: null,
  editor: null,
  noTextPage: null,
};
const listeners = new Set<() => void>();

export function getAnnotateUi(): AnnotateUi {
  return state;
}

export function setAnnotateUi(patch: Partial<AnnotateUi>): void {
  state = { ...state, ...patch };
  for (const l of [...listeners]) l();
}

export function useAnnotateUi(): AnnotateUi {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
