import { ToolError } from '@/shared/lib/errors';

export type Row = Record<string, unknown>;

/** An immutable table: every edit returns a new one, sharing unchanged rows. */
export interface Table {
  columns: string[];
  rows: Row[];
}

export interface CellChange {
  row: number;
  col: string;
  value: unknown;
}

export type EditOp =
  | { kind: 'set-cell'; row: number; col: string; value: unknown }
  | { kind: 'add-row'; at: number }
  | { kind: 'delete-rows'; rows: number[] }
  | { kind: 'add-column'; name: string; at: number }
  | { kind: 'delete-column'; col: string }
  | { kind: 'rename-column'; col: string; name: string }
  /** Keeps the first of each group of equal rows (by `by`, or all columns). */
  | { kind: 'dedupe'; by: string[] }
  | { kind: 'trim' }
  | {
      kind: 'replace';
      col: string;
      find: string;
      replace: string;
      regex: boolean;
    }
  // Inverses of the above (also valid ops in their own right).
  | { kind: 'set-cells'; cells: CellChange[] }
  | { kind: 'insert-rows'; entries: { at: number; row: Row }[] }
  | { kind: 'insert-column'; name: string; at: number; values: unknown[] }
  | { kind: 'restore'; snapshot: Table };

export interface EditResult {
  table: Table;
  inverse: EditOp;
}

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

function checkColumn(table: Table, col: string) {
  if (!table.columns.includes(col))
    throw invalid(`There is no column named ${col}`);
}

function checkRow(table: Table, row: number) {
  if (!Number.isInteger(row) || row < 0 || row >= table.rows.length)
    throw invalid(`There is no row ${row + 1}`);
}

function checkNewName(table: Table, name: string) {
  if (name.trim() === '') throw invalid('A column needs a name');
  if (table.columns.includes(name))
    throw invalid(`A column named ${name} already exists`);
}

const clampAt = (at: number, length: number) =>
  Math.max(0, Math.min(length, Math.trunc(at)));

function setCells(table: Table, cells: CellChange[]): EditResult {
  const rows = [...table.rows];
  const inverse: CellChange[] = [];
  for (const c of cells) {
    checkRow(table, c.row);
    checkColumn(table, c.col);
    inverse.push({ row: c.row, col: c.col, value: rows[c.row][c.col] });
    rows[c.row] = { ...rows[c.row], [c.col]: c.value };
  }
  // Undo in reverse order so repeated cells end on their first old value.
  return {
    table: { columns: table.columns, rows },
    inverse: { kind: 'set-cells', cells: inverse.reverse() },
  };
}

function rowKey(row: Row, by: readonly string[]): string {
  return JSON.stringify(by.map((c) => row[c] ?? null));
}

/** Rows replaced by the result of `fn` where it differs; set-cells inverse. */
function mapCells(
  table: Table,
  cols: readonly string[],
  fn: (v: unknown) => unknown,
): EditResult {
  const cells: CellChange[] = [];
  table.rows.forEach((row, i) => {
    for (const col of cols) {
      const next = fn(row[col]);
      if (next !== row[col]) cells.push({ row: i, col, value: next });
    }
  });
  return setCells(table, cells);
}

function compilePattern(find: string): RegExp {
  try {
    return new RegExp(find, 'g');
  } catch (e) {
    throw invalid(
      `Invalid pattern: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/** Applies one edit. Pure: the input table is never changed. */
export function applyEdit(table: Table, op: EditOp): EditResult {
  switch (op.kind) {
    case 'set-cell':
      return setCells(table, [op]);
    case 'set-cells':
      return setCells(table, op.cells);
    case 'add-row': {
      const at = clampAt(op.at, table.rows.length);
      const row: Row = {};
      for (const c of table.columns) row[c] = null;
      return applyEdit(table, { kind: 'insert-rows', entries: [{ at, row }] });
    }
    case 'insert-rows': {
      // Entries are positions in the final table, applied in ascending order.
      const entries = [...op.entries].sort((a, b) => a.at - b.at);
      const rows = [...table.rows];
      for (const e of entries)
        rows.splice(clampAt(e.at, rows.length), 0, e.row);
      return {
        table: { columns: table.columns, rows },
        inverse: { kind: 'delete-rows', rows: entries.map((e) => e.at) },
      };
    }
    case 'delete-rows': {
      const drop = new Set(op.rows);
      for (const r of drop) checkRow(table, r);
      const entries: { at: number; row: Row }[] = [];
      const rows: Row[] = [];
      table.rows.forEach((row, i) => {
        if (drop.has(i)) entries.push({ at: i, row });
        else rows.push(row);
      });
      return {
        table: { columns: table.columns, rows },
        inverse: { kind: 'insert-rows', entries },
      };
    }
    case 'add-column':
      checkNewName(table, op.name);
      return applyEdit(table, {
        kind: 'insert-column',
        name: op.name,
        at: op.at,
        values: [],
      });
    case 'insert-column': {
      checkNewName(table, op.name);
      const columns = [...table.columns];
      columns.splice(clampAt(op.at, columns.length), 0, op.name);
      // Rebuilt in column order, so undoing a delete restores key order.
      const rows = table.rows.map((row, i) => {
        const next: Row = {};
        for (const c of columns)
          next[c] =
            c !== op.name ? row[c] : i < op.values.length ? op.values[i] : null;
        return next;
      });
      return {
        table: { columns, rows },
        inverse: { kind: 'delete-column', col: op.name },
      };
    }
    case 'delete-column': {
      checkColumn(table, op.col);
      const at = table.columns.indexOf(op.col);
      const values = table.rows.map((r) => r[op.col]);
      const rows = table.rows.map((row) => {
        const next = { ...row };
        delete next[op.col];
        return next;
      });
      return {
        table: { columns: table.columns.filter((c) => c !== op.col), rows },
        inverse: { kind: 'insert-column', name: op.col, at, values },
      };
    }
    case 'rename-column': {
      checkColumn(table, op.col);
      if (op.name === op.col)
        return { table, inverse: { kind: 'set-cells', cells: [] } };
      checkNewName(table, op.name);
      const columns = table.columns.map((c) => (c === op.col ? op.name : c));
      const rows = table.rows.map((row) => {
        const next: Row = {};
        for (const c of table.columns)
          next[c === op.col ? op.name : c] = row[c];
        return next;
      });
      return {
        table: { columns, rows },
        inverse: { kind: 'rename-column', col: op.name, name: op.col },
      };
    }
    case 'dedupe': {
      const by = op.by.length > 0 ? op.by : table.columns;
      for (const c of by) checkColumn(table, c);
      const seen = new Set<string>();
      const dupes: number[] = [];
      table.rows.forEach((row, i) => {
        const k = rowKey(row, by);
        if (seen.has(k)) dupes.push(i);
        else seen.add(k);
      });
      return applyEdit(table, { kind: 'delete-rows', rows: dupes });
    }
    case 'trim':
      return mapCells(table, table.columns, (v) =>
        typeof v === 'string' ? v.trim() : v,
      );
    case 'replace': {
      checkColumn(table, op.col);
      const pattern = op.regex ? compilePattern(op.find) : null;
      if (!pattern && op.find === '') throw invalid('Enter text to find');
      return mapCells(table, [op.col], (v) => {
        if (v === null || v === undefined) return v;
        const s = String(v);
        const next = pattern
          ? s.replace(pattern, op.replace)
          : s.split(op.find).join(op.replace);
        return next === s ? v : next;
      });
    }
    case 'restore':
      return {
        table: op.snapshot,
        inverse: { kind: 'restore', snapshot: table },
      };
  }
}

export const HISTORY_MAX = 100;

export interface EditHistory {
  table: Table;
  undo: EditOp[];
  redo: EditOp[];
}

export const startHistory = (table: Table): EditHistory => ({
  table,
  undo: [],
  redo: [],
});

/** Applies an edit; the redo stack is dropped and the undo stack capped. */
export function edit(h: EditHistory, op: EditOp): EditHistory {
  const { table, inverse } = applyEdit(h.table, op);
  return {
    table,
    undo: [...h.undo, inverse].slice(-HISTORY_MAX),
    redo: [],
  };
}

export function undo(h: EditHistory): EditHistory {
  const op = h.undo.at(-1);
  if (!op) return h;
  const { table, inverse } = applyEdit(h.table, op);
  return { table, undo: h.undo.slice(0, -1), redo: [...h.redo, inverse] };
}

export function redo(h: EditHistory): EditHistory {
  const op = h.redo.at(-1);
  if (!op) return h;
  const { table, inverse } = applyEdit(h.table, op);
  return { table, undo: [...h.undo, inverse], redo: h.redo.slice(0, -1) };
}

/** True once any edit is in the undo stack ("Modified" badge). */
export const isModified = (h: EditHistory): boolean => h.undo.length > 0;
