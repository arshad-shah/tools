import { typeLabel } from './example';
import { isObj, refName, resolve, type Obj } from './refs';

/** One property of a schema, flattened: `owner.name`, `tags[].id`. */
export interface SchemaRow {
  path: string;
  type: string;
  required: boolean;
  description?: string;
  /** enum values, readOnly, deprecated... in words. */
  notes: string[];
}

export interface SchemaRowsResult {
  rows: SchemaRow[];
  /** Stopped at `limit` rows. */
  truncated: boolean;
}

/** Properties of an object schema (allOf merged), with what is required. */
function objectParts(
  doc: unknown,
  s: Obj,
  seen: readonly string[],
): { props: [string, unknown][]; required: Set<string> } {
  const props: [string, unknown][] = [];
  const required = new Set<string>(
    Array.isArray(s.required) ? s.required.map(String) : [],
  );
  if (isObj(s.properties)) props.push(...Object.entries(s.properties));
  if (Array.isArray(s.allOf))
    for (const part of s.allOf) {
      const r = resolve(doc, part, seen);
      if (!isObj(r.value)) continue;
      const inner = objectParts(doc, r.value, [...seen, ...r.refs]);
      props.push(...inner.props);
      for (const k of inner.required) required.add(k);
    }
  return { props, required };
}

function notesOf(s: Obj): string[] {
  const notes: string[] = [];
  if (Array.isArray(s.enum))
    notes.push(`One of: ${s.enum.map((v) => JSON.stringify(v)).join(', ')}`);
  if (s.readOnly === true) notes.push('Read only');
  if (s.writeOnly === true) notes.push('Write only');
  if (s.deprecated === true) notes.push('Deprecated');
  if ('default' in s) notes.push(`Default ${JSON.stringify(s.default)}`);
  if (typeof s.pattern === 'string') notes.push(`Pattern ${s.pattern}`);
  for (const [k, label] of [
    ['minimum', 'Minimum'],
    ['maximum', 'Maximum'],
    ['minLength', 'Min length'],
    ['maxLength', 'Max length'],
    ['minItems', 'Min items'],
    ['maxItems', 'Max items'],
  ] as const)
    if (typeof s[k] === 'number') notes.push(`${label} ${s[k]}`);
  return notes;
}

/**
 * A schema's properties as rows, nested objects and array items expanded
 * with dotted paths up to `maxDepth`. A schema that contains itself is
 * listed once, its type marked "circular".
 */
export function schemaRows(
  doc: unknown,
  schema: unknown,
  { maxDepth = 4, limit = 300 } = {},
): SchemaRowsResult {
  const rows: SchemaRow[] = [];
  let truncated = false;

  const visit = (
    node: unknown,
    prefix: string,
    seen: readonly string[],
    depth: number,
  ) => {
    const r = resolve(doc, node, seen);
    if (!isObj(r.value)) return;
    const s = r.value;
    const path = [...seen, ...r.refs];
    // Arrays: describe their items under `name[]`.
    if (s.items !== undefined && !isObj(s.properties)) {
      if (prefix) visit(s.items, `${prefix}[]`, path, depth);
      else visit(s.items, '[]', path, depth);
      return;
    }
    const { props, required } = objectParts(doc, s, path);
    for (const [name, child] of props) {
      if (rows.length >= limit) {
        truncated = true;
        return;
      }
      const c = resolve(doc, child, path);
      const cs = isObj(c.value) ? c.value : {};
      const full = prefix ? `${prefix}.${name}` : name;
      rows.push({
        path: full,
        type: c.circular
          ? `${refName(c.circular)} (circular)`
          : typeLabel(doc, child),
        required: required.has(name),
        description:
          typeof cs.description === 'string' ? cs.description : undefined,
        notes: notesOf(cs),
      });
      if (c.circular || depth + 1 >= maxDepth) continue;
      const childPath = [...path, ...c.refs];
      const isArray = cs.items !== undefined;
      const inner = isArray ? resolve(doc, cs.items, childPath) : null;
      const target = inner && isObj(inner.value) ? inner.value : cs;
      if (inner?.circular) continue;
      if (isObj(target.properties) || Array.isArray(target.allOf))
        visit(child, full, path, depth + 1);
    }
  };

  visit(schema, '', [], 0);
  return { rows, truncated };
}
