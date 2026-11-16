/**
 * Column model shared by the grid helpers (sort, filters): what a column
 * reads from a row and how it sorts. Cynosure's DataGrid draws the table.
 */
import type { ReactNode } from 'react';

export type ColumnType = 'text' | 'number' | 'date' | 'boolean';

export interface GridColumn<R> {
  id: string;
  /** Plain text: it also names the header controls ("Filter Name"). */
  header: string;
  accessor(row: R): unknown;
  type?: ColumnType;
  width?: number;
  minWidth?: number;
  hidden?: boolean;
  /** Pinned columns stay at the start and stick while scrolling sideways. */
  pinned?: 'start';
  /**
   * Custom cell content, such as a Meter or row actions. `accessor` still
   * drives sorting, filters, search, copy and auto width, so give it the
   * cell's plain text. Controls inside the cell stay reachable with Tab.
   */
  render?(row: R): ReactNode;
}

export interface SortKey {
  id: string;
  dir: 'asc' | 'desc';
}
