import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { generateMock } from './engine';
import { constName, exportRows, typeName } from './export';
import { PRESETS } from './presets';

const users = generateMock(PRESETS.users, {
  count: 5,
  seed: 'export',
  locale: 'en-US',
}).users;

describe('exportRows', () => {
  it('writes a TypeScript fixture that compiles', () => {
    const { text, extension } = exportRows(users, 'ts', { name: 'users' });
    expect(extension).toBe('ts');
    expect(text).toContain('export interface User {');
    expect(text).toContain('export const users = [');
    expect(text).toContain('as const satisfies readonly User[];');
    const out = ts.transpileModule(text, {
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    });
    expect(out.diagnostics ?? []).toEqual([]);
  });

  it('quotes SQL per dialect and flattens nested objects', () => {
    const pg = exportRows(users, 'sql', {
      name: 'users',
      sqlDialect: 'postgres',
    });
    expect(pg.text).toContain('INSERT INTO "users" ("id", "name"');
    expect(pg.text).toContain('"address.city"');
    const my = exportRows(users, 'sql', { name: 'users', sqlDialect: 'mysql' });
    expect(my.text).toContain('INSERT INTO `users` (`id`');
    const ms = exportRows(users, 'sql', { name: 'users', sqlDialect: 'mssql' });
    expect(ms.text).toContain('INSERT INTO [users] ([id]');
  });

  it('names the XML root after the table', () => {
    const { text } = exportRows(users, 'xml', { name: 'users' });
    expect(
      text.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<users><user>'),
    ).toBe(true);
    expect(text.match(/<user>/g)).toHaveLength(5);
  });

  it('writes CSV with dotted columns and NDJSON lines', () => {
    const csv = exportRows(users, 'csv', { name: 'users' }).text;
    expect(csv.split('\n')[0]).toContain('address.city');
    expect(csv.trim().split('\n')).toHaveLength(6);
    const nd = exportRows(users, 'ndjson', { name: 'users' }).text;
    expect(
      nd
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l)),
    ).toEqual(users);
  });
});

describe('names', () => {
  it.each([
    ['users', 'User', 'users'],
    ['order_items', 'OrderItem', 'orderItems'],
    ['categories', 'Category', 'categories'],
    ['people', 'Person', 'people'],
    ['addresses', 'Address', 'addresses'],
    ['status', 'Status', 'status'],
  ])('%s gives %s and %s', (table, type, name) => {
    expect(typeName(table)).toBe(type);
    expect(constName(table)).toBe(name);
  });
});
