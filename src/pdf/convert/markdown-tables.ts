import type { TextItemGeom } from '@/pdf/render';

/** A table cell from the flat-form cell detector, PDF user space. */
export interface CellBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A table written as GFM, at the height of its top edge. */
export interface MarkdownTable {
  /** Top edge, PDF user space (larger is higher on the page). */
  y: number;
  markdown: string;
}

const TOUCH = 1.5;
const SNAP = 1;

const sizeOf = (it: TextItemGeom) =>
  Math.hypot(it.transform[2], it.transform[3]) || it.height || 0;

const touches = (a: CellBox, b: CellBox) => {
  const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const yOverlap =
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const side =
    Math.abs(a.x + a.width - b.x) <= TOUCH ||
    Math.abs(b.x + b.width - a.x) <= TOUCH;
  const stacked =
    Math.abs(a.y + a.height - b.y) <= TOUCH ||
    Math.abs(b.y + b.height - a.y) <= TOUCH;
  return (side && yOverlap > 0) || (stacked && xOverlap > 0);
};

/** Cells sharing an edge, as tables. */
function groups(cells: CellBox[]): CellBox[][] {
  const parent = cells.map((_, i) => i);
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (let i = 0; i < cells.length; i++)
    for (let j = i + 1; j < cells.length; j++)
      if (touches(cells[i], cells[j])) parent[find(i)] = find(j);
  const out = new Map<number, CellBox[]>();
  cells.forEach((c, i) => {
    const g = out.get(find(i));
    if (g) g.push(c);
    else out.set(find(i), [c]);
  });
  return [...out.values()];
}

/** Distinct values, ones within SNAP merged. */
function distinct(values: number[], desc: boolean): number[] {
  const s = [...values].sort((a, b) => (desc ? b - a : a - b));
  const out: number[] = [];
  for (const v of s)
    if (!out.length || Math.abs(out[out.length - 1] - v) > SNAP) out.push(v);
  return out;
}

const indexOf = (list: number[], v: number) =>
  list.findIndex((x) => Math.abs(x - v) <= SNAP);

const inside = (c: CellBox, it: TextItemGeom) => {
  const x = it.transform[4] + it.width / 2;
  const y = it.transform[5] + 0.3 * sizeOf(it);
  return x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height;
};

const escapeCell = (s: string) =>
  s.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');

/**
 * Detected table cells as GFM tables (spec 7.2): each group of touching
 * cells with at least two rows and two columns is a table, the first row
 * its header; a cell spanning several columns or rows writes its text in
 * the first. Text inside a table is taken out of the page's flowing text.
 */
export function tablesOf(
  items: TextItemGeom[],
  cells: readonly CellBox[],
): { tables: MarkdownTable[]; rest: TextItemGeom[] } {
  const used = new Set<TextItemGeom>();
  const tables: MarkdownTable[] = [];
  for (const members of groups([...cells])) {
    const tops = distinct(
      members.map((c) => c.y + c.height),
      true,
    );
    const lefts = distinct(
      members.map((c) => c.x),
      false,
    );
    if (tops.length < 2 || lefts.length < 2) continue;
    const grid = tops.map(() => lefts.map(() => [] as TextItemGeom[]));
    for (const c of members) {
      const r = indexOf(tops, c.y + c.height);
      const col = indexOf(lefts, c.x);
      for (const it of items)
        if (!used.has(it) && it.str.trim() !== '' && inside(c, it)) {
          grid[r][col].push(it);
          used.add(it);
        }
    }
    const text = (list: TextItemGeom[]) =>
      escapeCell(
        list
          .sort(
            (a, b) =>
              b.transform[5] - a.transform[5] ||
              a.transform[4] - b.transform[4],
          )
          .map((it) => it.str)
          .join(' '),
      );
    const rows = grid.map((row) => `| ${row.map(text).join(' | ')} |`);
    const rule = `| ${lefts.map(() => '---').join(' | ')} |`;
    tables.push({
      y: tops[0],
      markdown: [rows[0], rule, ...rows.slice(1)].join('\n'),
    });
  }
  return { tables, rest: items.filter((it) => !used.has(it)) };
}
