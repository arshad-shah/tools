import { describe, expect, it } from 'vitest';
import {
  applyEdit,
  edit,
  HISTORY_MAX,
  isModified,
  redo,
  startHistory,
  undo,
  type EditOp,
  type Table,
} from './edit';

const table = (): Table => ({
  columns: ['id', 'email', 'note'],
  rows: [
    { id: 1, email: 'a@x.io', note: ' hi ' },
    { id: 2, email: 'b@x.io', note: 'yo' },
    { id: 3, email: 'a@x.io', note: 'again' },
    { id: 4, email: 'c@x.io', note: null },
    { id: 4, email: 'c@x.io', note: null },
  ],
});

const ops: [string, EditOp][] = [
  ['set-cell', { kind: 'set-cell', row: 1, col: 'note', value: 'changed' }],
  ['add-row', { kind: 'add-row', at: 2 }],
  ['add-row at the end', { kind: 'add-row', at: 99 }],
  ['delete-rows', { kind: 'delete-rows', rows: [0, 2] }],
  ['add-column', { kind: 'add-column', name: 'extra', at: 1 }],
  ['delete-column', { kind: 'delete-column', col: 'email' }],
  ['rename-column', { kind: 'rename-column', col: 'email', name: 'mail' }],
  ['dedupe', { kind: 'dedupe', by: ['email'] }],
  ['dedupe all columns', { kind: 'dedupe', by: [] }],
  ['trim', { kind: 'trim' }],
  [
    'replace',
    {
      kind: 'replace',
      col: 'email',
      find: 'x.io',
      replace: 'y.dev',
      regex: false,
    },
  ],
  [
    'regex replace',
    {
      kind: 'replace',
      col: 'id',
      find: '^(\\d)$',
      replace: '0$1',
      regex: true,
    },
  ],
];

describe('applyEdit', () => {
  it.each(ops)('%s and its inverse restore the exact table', (_, op) => {
    const before = table();
    const snapshot = structuredClone(before);
    const { table: after, inverse } = applyEdit(before, op);
    expect(before).toEqual(snapshot);
    expect(after).not.toEqual(snapshot);
    const restored = applyEdit(after, inverse).table;
    expect(restored).toEqual(snapshot);
    expect(restored.columns).toEqual(snapshot.columns);
    restored.rows.forEach((r, i) =>
      expect(Object.keys(r)).toEqual(Object.keys(snapshot.rows[i])),
    );
  });

  it('dedupes by email keeping the first', () => {
    const r = applyEdit(table(), { kind: 'dedupe', by: ['email'] }).table;
    expect(r.rows.map((x) => x.id)).toEqual([1, 2, 4]);
    const all = applyEdit(table(), { kind: 'dedupe', by: [] }).table;
    expect(all.rows.map((x) => x.id)).toEqual([1, 2, 3, 4]);
  });

  it('refuses a rename onto an existing column', () => {
    expect(() =>
      applyEdit(table(), { kind: 'rename-column', col: 'email', name: 'id' }),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'A column named id already exists',
      }),
    );
  });

  it('refuses an invalid regex', () => {
    expect(() =>
      applyEdit(table(), {
        kind: 'replace',
        col: 'note',
        find: '(',
        replace: '',
        regex: true,
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('trims strings only', () => {
    const r = applyEdit(table(), { kind: 'trim' }).table;
    expect(r.rows[0].note).toBe('hi');
    expect(r.rows[3].note).toBeNull();
  });

  it('adds an empty row', () => {
    const r = applyEdit(table(), { kind: 'add-row', at: 0 }).table;
    expect(r.rows[0]).toEqual({ id: null, email: null, note: null });
  });
});

describe('edit history', () => {
  it('undoes and redoes', () => {
    let h = startHistory(table());
    expect(isModified(h)).toBe(false);
    h = edit(h, { kind: 'set-cell', row: 0, col: 'id', value: 9 });
    h = edit(h, { kind: 'delete-column', col: 'note' });
    expect(isModified(h)).toBe(true);
    h = undo(h);
    expect(h.table.columns).toContain('note');
    h = undo(h);
    expect(h.table).toEqual(table());
    expect(isModified(h)).toBe(false);
    h = redo(h);
    expect(h.table.rows[0].id).toBe(9);
    h = redo(h);
    expect(h.table.columns).not.toContain('note');
    expect(redo(h)).toBe(h);
  });

  it('drops the redo stack on a new edit', () => {
    let h = edit(startHistory(table()), { kind: 'trim' });
    h = undo(h);
    h = edit(h, { kind: 'add-row', at: 0 });
    expect(h.redo).toEqual([]);
  });

  it(`keeps at most ${HISTORY_MAX} undo steps`, () => {
    let h = startHistory(table());
    for (let i = 0; i < HISTORY_MAX + 5; i++)
      h = edit(h, { kind: 'set-cell', row: 0, col: 'id', value: i });
    expect(h.undo).toHaveLength(HISTORY_MAX);
  });
});
