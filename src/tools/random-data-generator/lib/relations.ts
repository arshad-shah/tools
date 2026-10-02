import type {
  MockField,
  MockSchema,
  MockTable,
} from '@/shared/lib/data-formats/mock-schema';
import { ToolError } from '@/shared/lib/errors';

export interface ForeignKey {
  /** The referenced table and its top-level field. */
  table: string;
  field: string;
}

/** Every foreign-key field in a table, at any depth. */
export function foreignKeys(fields: readonly MockField[]): ForeignKey[] {
  const out: ForeignKey[] = [];
  const walk = (fs: readonly MockField[]) => {
    for (const f of fs) {
      if (f.type === 'foreign-key') {
        if (!f.table || !f.field)
          throw new ToolError(
            'INVALID_INPUT',
            `${f.name}: choose the table and field it references`,
          );
        out.push({ table: f.table, field: f.field });
      }
      if (f.fields) walk(f.fields);
    }
  };
  walk(fields);
  return out;
}

/**
 * Tables in generation order: every table after the tables it references.
 * Unknown targets and reference cycles give INVALID_INPUT.
 */
export function tableOrder(schema: MockSchema): MockTable[] {
  const byName = new Map(schema.tables.map((t) => [t.name, t]));
  const deps = new Map<string, Set<string>>();
  for (const t of schema.tables) {
    const set = new Set<string>();
    for (const fk of foreignKeys(t.fields)) {
      const target = byName.get(fk.table);
      if (!target)
        throw new ToolError(
          'INVALID_INPUT',
          `${t.name} references a table named ${fk.table}, which does not exist`,
        );
      if (!target.fields.some((f) => f.name === fk.field))
        throw new ToolError(
          'INVALID_INPUT',
          `${t.name} references ${fk.table}.${fk.field}, which does not exist`,
        );
      set.add(fk.table);
    }
    deps.set(t.name, set);
  }
  const order: MockTable[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (name: string, path: string[]) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'visiting')
      throw new ToolError(
        'INVALID_INPUT',
        `Tables reference each other in a cycle: ${[...path, name].join(' to ')}`,
      );
    state.set(name, 'visiting');
    for (const d of deps.get(name) ?? []) visit(d, [...path, name]);
    state.set(name, 'done');
    order.push(byName.get(name)!);
  };
  for (const t of schema.tables) visit(t.name, []);
  return order;
}
