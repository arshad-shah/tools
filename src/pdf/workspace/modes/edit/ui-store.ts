import { useSyncExternalStore } from 'react';
import type { ContentFont } from '@/pdf/doc/ops/edit';
import type { Box } from '@/pdf/doc/types';

export type EditTool =
  | 'select'
  | 'text'
  | 'image'
  | 'shape'
  | 'cover'
  | 'watermark'
  | 'page-numbers'
  | 'header-footer';

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow';

/** A text entry waiting for its words: a new text box or a cover. */
export interface TextPrompt {
  kind: 'text' | 'cover';
  pageId: string;
  rect: Box;
  /** Cover fill sampled from the page. */
  fill?: string;
}

export interface EditUi {
  text: {
    font: ContentFont;
    size: number;
    color: string;
    align: 'left' | 'center' | 'right';
    lineHeight: number;
  };
  shape: {
    stroke: string | null;
    fill: string | null;
    width: number;
    opacity: number;
  };
  shapeKind: ShapeKind;
  /** An image picked with the Image tool, waiting to be placed. */
  image: {
    assetId: string;
    mime: 'image/png' | 'image/jpeg';
    aspect: number;
  } | null;
  prompt: TextPrompt | null;
}

let state: EditUi = {
  text: {
    font: 'Helvetica',
    size: 14,
    color: '#111827',
    align: 'left',
    lineHeight: 1.2,
  },
  shape: { stroke: '#1f2937', fill: null, width: 2, opacity: 1 },
  shapeKind: 'rect',
  image: null,
  prompt: null,
};
const listeners = new Set<() => void>();

export const getEditUi = (): EditUi => state;

export function setEditUi(patch: Partial<EditUi>): void {
  state = { ...state, ...patch };
  for (const l of [...listeners]) l();
}

export function useEditUi(): EditUi {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** Tool ids as the workspace stores them (Select is no tool). */
export const toolOf = (id: string | null): EditTool =>
  (
    [
      'text',
      'image',
      'shape',
      'cover',
      'watermark',
      'page-numbers',
      'header-footer',
    ] as const
  ).find((t) => t === id) ?? 'select';
