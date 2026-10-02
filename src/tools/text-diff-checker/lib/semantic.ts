import Papa from 'papaparse';
import {
  JsonLocateError,
  parseJsonWithLocations,
} from '@/shared/lib/data-formats/json-locate';
import { ToolError } from '@/shared/lib/errors';
import { splitLines } from './engine';

export type Side = 'Left' | 'Right';

export interface JsonChange {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  left?: unknown;
  right?: unknown;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** A JSONPath step for an object key or array index. */
export const pathStep = (parent: string, key: string | number): string =>
  typeof key === 'number'
    ? `${parent}[${key}]`
    : IDENT.test(key)
      ? `${parent}.${key}`
      : `${parent}[${JSON.stringify(key).replace(/^"|"$/g, "'")}]`;

/** Parses one side, naming the side and position on failure. */
export function parseJsonSide(text: string, side: Side): unknown {
  try {
    return parseJsonWithLocations(text).value;
  } catch (e) {
    if (e instanceof JsonLocateError)
      throw new ToolError(
        'INVALID_INPUT',
        `${side} side is not valid JSON: line ${e.line}, column ${e.column}`,
        { cause: e },
      );
    throw e;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function walk(
  a: unknown,
  b: unknown,
  path: string,
  sortKeys: boolean,
  out: JsonChange[],
): void {
  if (isObject(a) && isObject(b)) {
    const keys = [...Object.keys(a)];
    for (const k of Object.keys(b)) if (!(k in a)) keys.push(k);
    if (sortKeys) keys.sort();
    for (const k of keys) {
      const p = pathStep(path, k);
      if (!Object.hasOwn(b, k))
        out.push({ path: p, kind: 'removed', left: a[k] });
      else if (!Object.hasOwn(a, k))
        out.push({ path: p, kind: 'added', right: b[k] });
      else walk(a[k], b[k], p, sortKeys, out);
    }
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const p = pathStep(path, i);
      if (i >= b.length) out.push({ path: p, kind: 'removed', left: a[i] });
      else if (i >= a.length) out.push({ path: p, kind: 'added', right: b[i] });
      else walk(a[i], b[i], p, sortKeys, out);
    }
    return;
  }
  if (!Object.is(a, b)) out.push({ path, kind: 'changed', left: a, right: b });
}

/**
 * Structural JSON diff by JSONPath (arrays by index). Key order never
 * matters to the result; `sortKeys` also lists the paths in key order.
 */
export function diffJson(
  a: string,
  b: string,
  { sortKeys }: { sortKeys: boolean },
): JsonChange[] {
  const out: JsonChange[] = [];
  walk(parseJsonSide(a, 'Left'), parseJsonSide(b, 'Right'), '$', sortKeys, out);
  return out;
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (isObject(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) out[k] = sortDeep(v[k]);
    return out;
  }
  return v;
}

/** Pretty JSON for the text view of the JSON mode (keys sorted on request). */
export function normaliseJson(
  text: string,
  side: Side,
  sortKeys: boolean,
): string {
  const v = parseJsonSide(text, side);
  return JSON.stringify(sortKeys ? sortDeep(v) : v, null, 2);
}

export interface CsvChange {
  key: string;
  kind: 'added' | 'removed' | 'changed';
  cells?: { column: string; left: string; right: string }[];
}

interface CsvTable {
  columns: string[];
  rows: Map<string, Record<string, string>>;
}

function parseCsvSide(text: string, side: Side, key: string): CsvTable {
  const r = Papa.parse<Record<string, string | undefined>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  const columns = r.meta.fields ?? [];
  if (!columns.includes(key))
    throw new ToolError(
      'INVALID_INPUT',
      `${side} side has no column named ${key}`,
    );
  const rows = new Map<string, Record<string, string>>();
  for (const row of r.data) {
    const id = row[key] ?? '';
    if (rows.has(id)) continue;
    const clean: Record<string, string> = {};
    for (const c of columns) clean[c] = row[c] ?? '';
    rows.set(id, clean);
  }
  return { columns, rows };
}

/** The column names of a CSV text (for the key picker). */
export function csvColumns(text: string): string[] {
  return (
    Papa.parse(text, { header: true, preview: 1, skipEmptyLines: true }).meta
      .fields ?? []
  );
}

/**
 * Rows matched by a key column: added, removed, or changed with the cells
 * that differ. The first row wins when a key repeats.
 */
export function diffCsv(
  a: string,
  b: string,
  { key }: { key: string },
): CsvChange[] {
  const left = parseCsvSide(a, 'Left', key);
  const right = parseCsvSide(b, 'Right', key);
  const columns = [
    ...left.columns,
    ...right.columns.filter((c) => !left.columns.includes(c)),
  ].filter((c) => c !== key);
  const out: CsvChange[] = [];
  for (const [id, row] of left.rows) {
    const other = right.rows.get(id);
    if (!other) {
      out.push({ key: id, kind: 'removed' });
      continue;
    }
    const cells = columns
      .map((column) => ({
        column,
        left: row[column] ?? '',
        right: other[column] ?? '',
      }))
      .filter((c) => c.left !== c.right);
    if (cells.length > 0) out.push({ key: id, kind: 'changed', cells });
  }
  for (const id of right.rows.keys())
    if (!left.rows.has(id)) out.push({ key: id, kind: 'added' });
  return out;
}

/** Multiset line diff: what each side has more of, in first-seen order. */
export function diffIgnoreOrder(
  a: string | string[],
  b: string | string[],
): { added: string[]; removed: string[] } {
  const la = typeof a === 'string' ? splitLines(a) : a;
  const lb = typeof b === 'string' ? splitLines(b) : b;
  const counts = new Map<string, number>();
  for (const l of la) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const l of lb) counts.set(l, (counts.get(l) ?? 0) - 1);
  const added: string[] = [];
  const removed: string[] = [];
  for (const [line, n] of counts) {
    for (let i = 0; i < n; i++) removed.push(line);
    for (let i = 0; i < -n; i++) added.push(line);
  }
  return { added, removed };
}
