import { isObj, refName, resolve, type Obj } from './refs';

const FORMAT_EXAMPLES: Record<string, unknown> = {
  'date-time': '2024-01-01T12:00:00Z',
  date: '2024-01-01',
  time: '12:00:00',
  email: 'user@example.com',
  uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  uri: 'https://example.com',
  url: 'https://example.com',
  hostname: 'example.com',
  ipv4: '192.0.2.1',
  ipv6: '2001:db8::1',
  byte: 'U3dhZ2dlcg==',
  binary: '',
  password: 'string',
};

/** The first type of a schema (3.1 allows a list, with "null"). */
function typeOf(s: Obj): string | undefined {
  if (typeof s.type === 'string') return s.type;
  if (Array.isArray(s.type))
    return s.type.find((t) => t !== 'null') as string | undefined;
  if (isObj(s.properties) || isObj(s.additionalProperties)) return 'object';
  if (s.items !== undefined) return 'array';
  return undefined;
}

export interface ExampleOptions {
  /** Leave out readOnly properties (request bodies) or writeOnly ones (responses). */
  skip?: 'readOnly' | 'writeOnly';
  maxDepth?: number;
}

/**
 * An example value for a schema: its own `example`, `examples`, `default`,
 * `const` or first `enum` value when it has one, else one built from its
 * type. `$ref`s are followed; a schema that contains itself stops there
 * (null, or an empty list or object), as does anything past `maxDepth`.
 */
export function exampleFor(
  doc: unknown,
  schema: unknown,
  opts: ExampleOptions = {},
): unknown {
  const maxDepth = opts.maxDepth ?? 10;
  const walk = (
    node: unknown,
    seen: readonly string[],
    depth: number,
  ): unknown => {
    const r = resolve(doc, node, seen);
    if (r.circular || r.missing || !isObj(r.value)) return null;
    const s = r.value;
    const path = [...seen, ...r.refs];
    if ('example' in s) return s.example;
    if (Array.isArray(s.examples) && s.examples.length) return s.examples[0];
    if ('const' in s) return s.const;
    if ('default' in s) return s.default;
    if (Array.isArray(s.enum) && s.enum.length) return s.enum[0];
    if (Array.isArray(s.allOf)) {
      const parts = s.allOf.map((x) => walk(x, path, depth + 1));
      if (parts.every((p) => isObj(p) || p === null))
        return Object.assign({}, ...parts.filter(isObj)) as Obj;
      return parts.find((p) => p !== null) ?? null;
    }
    for (const k of ['oneOf', 'anyOf'] as const)
      if (Array.isArray(s[k]) && s[k].length)
        return walk(s[k][0], path, depth + 1);
    if (depth >= maxDepth) return null;
    switch (typeOf(s)) {
      case 'object': {
        const out: Obj = {};
        if (isObj(s.properties))
          for (const [k, v] of Object.entries(s.properties)) {
            const prop = resolve(doc, v, path).value;
            if (opts.skip && isObj(prop) && prop[opts.skip] === true) continue;
            out[k] = walk(v, path, depth + 1);
          }
        else if (isObj(s.additionalProperties))
          out.key = walk(s.additionalProperties, path, depth + 1);
        return out;
      }
      case 'array':
        return s.items === undefined ? [] : [walk(s.items, path, depth + 1)];
      case 'string':
        if (typeof s.format === 'string' && s.format in FORMAT_EXAMPLES)
          return FORMAT_EXAMPLES[s.format];
        return 'string';
      case 'integer':
      case 'number': {
        const min = typeof s.minimum === 'number' ? s.minimum : undefined;
        const max = typeof s.maximum === 'number' ? s.maximum : undefined;
        return min ?? (max !== undefined && max < 0 ? max : 0);
      }
      case 'boolean':
        return true;
      case 'null':
        return null;
      case 'file':
        return '';
      default:
        return null;
    }
  };
  return walk(schema, [], 0);
}

/** A short type label: `string (date-time)`, `array of Pet`, `Pet`. */
export function typeLabel(doc: unknown, schema: unknown): string {
  const r = resolve(doc, schema);
  if (r.circular) return `${refName(r.circular)} (circular)`;
  if (r.missing) return `${refName(r.missing)} (not found)`;
  const s = isObj(r.value) ? r.value : {};
  const named = r.refs.length ? refName(r.refs[0]) : undefined;
  if (!named && Array.isArray(s.allOf) && s.allOf.length === 1)
    return typeLabel(doc, s.allOf[0]);
  for (const k of ['oneOf', 'anyOf', 'allOf'] as const)
    if (Array.isArray(s[k]))
      return named ?? `${k} ${s[k].map((x) => typeLabel(doc, x)).join(', ')}`;
  const t = typeOf(s);
  if (t === 'array') return `array of ${typeLabel(doc, s.items)}`;
  if (named) return named;
  if (!t) return 'any';
  const nullable =
    s.nullable === true || (Array.isArray(s.type) && s.type.includes('null'));
  const fmt = typeof s.format === 'string' ? ` (${s.format})` : '';
  return `${t}${fmt}${nullable ? ', nullable' : ''}`;
}
