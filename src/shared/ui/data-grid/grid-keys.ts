import type React from 'react';
import { isMac } from '@/shared/lib/platform';
import type { CellPos } from './selection';

export interface GridKeyContext {
  rows: number;
  cols: number;
  /** Rows per viewport, for PageUp and PageDown. */
  page: number;
  active: CellPos;
  /** `selection="cell-range"`: Shift+movement extends the range. */
  rangeSelect: boolean;
  hasRange: boolean;
  moveTo(pos: CellPos, extend: boolean): void;
  selectAll(): void;
  collapse(): void;
  activate(key: 'Enter' | ' '): void;
  edit(): void;
  copy(): void;
  moveColumn(delta: -1 | 1): void;
}

/**
 * The grid's keyboard model (spec §5, APG data grid): arrows move the active
 * cell, Home and End move within the row, Mod+Home and Mod+End go to the
 * first and last cell, PageUp and PageDown move by a viewport. Shift extends
 * a cell range, Alt+ArrowLeft and Alt+ArrowRight move the column (R13),
 * Enter and Space open the row, F2 edits and Mod+C copies.
 * Returns true when the key was handled (the caller prevents the default).
 */
export function handleGridKey(
  e: Pick<
    React.KeyboardEvent,
    'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
  >,
  ctx: GridKeyContext,
  mac: boolean = isMac(),
): boolean {
  const mod = mac ? e.metaKey : e.ctrlKey;
  const { active, rows, cols } = ctx;
  if (rows === 0 || cols === 0) return false;
  const extend = e.shiftKey && ctx.rangeSelect;
  const go = (row: number, col: number) => {
    ctx.moveTo({ row, col }, extend);
    return true;
  };

  if (e.altKey) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      ctx.moveColumn(e.key === 'ArrowLeft' ? -1 : 1);
      return true;
    }
    return false;
  }
  switch (e.key) {
    case 'ArrowUp':
      return go(active.row - 1, active.col);
    case 'ArrowDown':
      return go(active.row + 1, active.col);
    case 'ArrowLeft':
      return go(active.row, active.col - 1);
    case 'ArrowRight':
      return go(active.row, active.col + 1);
    case 'Home':
      return mod ? go(0, 0) : go(active.row, 0);
    case 'End':
      return mod ? go(rows - 1, cols - 1) : go(active.row, cols - 1);
    case 'PageUp':
      return go(active.row - ctx.page, active.col);
    case 'PageDown':
      return go(active.row + ctx.page, active.col);
    case 'Enter':
    case ' ':
      if (mod || e.shiftKey) return false;
      ctx.activate(e.key);
      return true;
    case 'F2':
      ctx.edit();
      return true;
    case 'Escape':
      if (!ctx.hasRange) return false;
      ctx.collapse();
      return true;
  }
  if (mod && !e.shiftKey && e.key.toLowerCase() === 'c') {
    ctx.copy();
    return true;
  }
  if (mod && !e.shiftKey && e.key.toLowerCase() === 'a' && ctx.rangeSelect) {
    ctx.selectAll();
    return true;
  }
  return false;
}
