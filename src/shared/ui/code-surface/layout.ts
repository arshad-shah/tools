import type { Token } from '@/shared/lib/syntax/tokenize';
import type { RowMap } from './text-model';
import type { CodeMarker, CodeRange, LineDecorationKind } from './types';

/** Line box of `text-sm` (13 px on 18 px) in the kit's type scale. */
export const LINE_HEIGHT = 18;
/** Vertical padding of the text (py-2). */
export const PAD_Y = 8;

export const rowTop = (row: number) => PAD_Y + row * LINE_HEIGHT;

export interface RowWindow {
  rows: RowMap;
  start: number;
  end: number;
  /** Soft wrap: rows flow (variable height) instead of sitting at fixed tops. */
  wrap: boolean;
}

export interface LineData {
  text(line: number): string;
  tokens(line: number): Token[];
  /** Ranges on `line`, relative to its start. */
  ranges(line: number, text: string): CodeRange[];
  markers: ReadonlyMap<number, CodeMarker[]>;
  decorations: ReadonlyMap<number, LineDecorationKind>;
}

/**
 * Wrap mode: text rows flow with their wrapped heights; copy each one's top
 * and height onto the gutter and fold rows with the same index.
 */
export function alignWrappedRows(root: HTMLElement): void {
  const tops = new Map<string, { top: number; height: number }>();
  root.querySelectorAll<HTMLElement>('[data-cs-row]').forEach((el) => {
    tops.set(el.dataset.csRow!, { top: el.offsetTop, height: el.offsetHeight });
  });
  root
    .querySelectorAll<HTMLElement>('[data-cs-gutter-row],[data-cs-fold-row]')
    .forEach((el) => {
      const key = el.dataset.csGutterRow ?? el.dataset.csFoldRow!;
      const at = tops.get(key);
      if (!at) return;
      el.style.top = `${at.top}px`;
      if (el.dataset.csGutterRow !== undefined)
        el.style.height = `${at.height}px`;
    });
}
