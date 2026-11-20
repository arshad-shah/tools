import { formatSerial } from './dates';
import {
  cellAddress,
  parseRange,
  parseRef,
  shiftFormula,
  type CellPos,
  type CellRange,
} from './refs';
import type { Styles } from './styles';
import {
  all,
  attr,
  children,
  decodeEscapes,
  first,
  stringItemText,
} from './xml';

export type CellType = 'string' | 'number' | 'boolean' | 'date' | 'error';

export interface Cell {
  type: CellType;
  /** Typed value: text, a number, a boolean, or ISO text for a date. */
  value: string | number | boolean;
  /** What the grid shows. */
  text: string;
  /** The value as stored in the file (a shared string index, a serial). */
  raw: string;
  /** Without the leading `=`. */
  formula?: string;
  /** For a cell sharing another cell's formula: that cell's address. */
  sharedFrom?: string;
  /** cellXfs index. */
  style?: number;
}

/** Shown on the grid: past these, cells are skipped and counted. */
export const MAX_ROWS = 200_000;
export const MAX_COLUMNS = 1_000;
export const MAX_CELLS = 2_000_000;

export interface Sheet {
  /** Sparse: `rows[r][c]`, both 0-based. */
  rows: (Cell | undefined)[][];
  rowCount: number;
  colCount: number;
  merges: CellRange[];
  cellCount: number;
  /** Cells past MAX_ROWS, MAX_COLUMNS or MAX_CELLS that were left out. */
  skipped: number;
}

export interface SheetContext {
  sharedStrings: readonly string[];
  styles: Styles;
  date1904: boolean;
}

const num = (v: string) => (v.trim() === '' ? NaN : Number(v));

function numberText(n: number): string {
  // Excel shows at most 15 significant digits.
  return Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(15)));
}

/** One `<c>`: its value per its type and style. Null when it holds nothing. */
function readCell(
  c: Element,
  ctx: SheetContext,
): Omit<Cell, 'formula' | 'sharedFrom'> | null {
  const t = c.getAttribute('t') ?? 'n';
  const s = c.getAttribute('s');
  const style = s === null ? undefined : Number(s);
  const v = children(c, 'v')[0]?.textContent ?? null;
  const base = style === undefined ? {} : { style };
  switch (t) {
    case 's': {
      if (v === null) return null;
      const text = ctx.sharedStrings[Number(v)] ?? '';
      return { ...base, type: 'string', value: text, text, raw: v };
    }
    case 'inlineStr': {
      const is = children(c, 'is')[0];
      const text = is ? stringItemText(is) : decodeEscapes(v ?? '');
      return { ...base, type: 'string', value: text, text, raw: text };
    }
    case 'str': {
      const text = decodeEscapes(v ?? '');
      return { ...base, type: 'string', value: text, text, raw: v ?? '' };
    }
    case 'b': {
      if (v === null) return null;
      const b = v.trim() === '1' || v.trim().toLowerCase() === 'true';
      return {
        ...base,
        type: 'boolean',
        value: b,
        text: b ? 'TRUE' : 'FALSE',
        raw: v,
      };
    }
    case 'e':
      return {
        ...base,
        type: 'error',
        value: v ?? '',
        text: v ?? '',
        raw: v ?? '',
      };
    case 'd': {
      if (v === null) return null;
      const iso = v.trim().replace(/Z$/, '').replace('T', ' ');
      return { ...base, type: 'date', value: iso, text: iso, raw: v };
    }
    default: {
      if (v === null) return null;
      const n = num(v);
      if (!Number.isFinite(n))
        return { ...base, type: 'string', value: v, text: v, raw: v };
      const kind = style === undefined ? null : ctx.styles.dateKindOf(style);
      if (kind) {
        const text = formatSerial(n, kind, ctx.date1904);
        return { ...base, type: 'date', value: text, text, raw: v };
      }
      return { ...base, type: 'number', value: n, text: numberText(n), raw: v };
    }
  }
}

/**
 * A worksheet's cells, merges and extent. Rows and cells without an `r`
 * follow the previous one. A cell sharing a formula gets the master's
 * formula moved to its own position.
 */
export function parseSheet(doc: Document, ctx: SheetContext): Sheet {
  const rows: (Cell | undefined)[][] = [];
  const masters = new Map<string, { formula: string; at: CellPos }>();
  let rowCount = 0;
  let colCount = 0;
  let cellCount = 0;
  let skipped = 0;
  let r = -1;
  for (const rowEl of all(doc, 'row')) {
    const rAttr = Number(rowEl.getAttribute('r'));
    r = Number.isInteger(rAttr) && rAttr > 0 ? rAttr - 1 : r + 1;
    let col = -1;
    for (const c of children(rowEl, 'c')) {
      const pos = parseRef(c.getAttribute('r') ?? '');
      col = pos ? pos.col : col + 1;
      const row = pos ? pos.row : r;
      const f = children(c, 'f')[0];
      const value = readCell(c, ctx);
      let formula = f?.textContent ? decodeEscapes(f.textContent) : undefined;
      let sharedFrom: string | undefined;
      const si = f?.getAttribute('si');
      if (
        f &&
        f.getAttribute('t') === 'shared' &&
        si !== null &&
        si !== undefined
      ) {
        const master = masters.get(si);
        if (formula) masters.set(si, { formula, at: { row, col } });
        else if (master) {
          formula = shiftFormula(master.formula, {
            row: row - master.at.row,
            col: col - master.at.col,
          });
          sharedFrom = cellAddress(master.at);
        }
      }
      if (!value && !formula) continue;
      if (row >= MAX_ROWS || col >= MAX_COLUMNS || cellCount >= MAX_CELLS) {
        skipped++;
        continue;
      }
      const cell: Cell = value ?? {
        type: 'string',
        value: '',
        text: '',
        raw: '',
      };
      if (formula) cell.formula = formula;
      if (sharedFrom) cell.sharedFrom = sharedFrom;
      (rows[row] ??= [])[col] = cell;
      cellCount++;
      rowCount = Math.max(rowCount, row + 1);
      colCount = Math.max(colCount, col + 1);
    }
  }
  const merges: CellRange[] = [];
  const mc = first(doc, 'mergeCells');
  if (mc)
    for (const m of children(mc, 'mergeCell')) {
      const range = parseRange(attr(m, 'ref') ?? '');
      if (
        !range ||
        range.start.row >= MAX_ROWS ||
        range.start.col >= MAX_COLUMNS
      )
        continue;
      merges.push(range);
      rowCount = Math.max(rowCount, Math.min(range.end.row + 1, MAX_ROWS));
      colCount = Math.max(colCount, Math.min(range.end.col + 1, MAX_COLUMNS));
    }
  return { rows, rowCount, colCount, merges, cellCount, skipped };
}
