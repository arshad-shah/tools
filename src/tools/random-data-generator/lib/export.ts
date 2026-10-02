import {
  columnsOf,
  flattenObject,
  jsonToXml,
  toCsv,
  toNdjson,
  toSqlInsert,
  type SqlDialect,
} from '@/shared/lib/data-formats';

export const MOCK_EXPORT_FORMATS = [
  'json',
  'csv',
  'tsv',
  'ndjson',
  'sql',
  'ts',
  'xml',
] as const;
export type MockExportFormat = (typeof MOCK_EXPORT_FORMATS)[number];

export const MOCK_EXPORT_LABEL: Record<MockExportFormat, string> = {
  json: 'JSON',
  csv: 'CSV',
  tsv: 'TSV',
  ndjson: 'NDJSON',
  sql: 'SQL INSERT',
  ts: 'TypeScript fixture',
  xml: 'XML',
};

const INFO: Record<MockExportFormat, { mime: string; extension: string }> = {
  json: { mime: 'application/json', extension: 'json' },
  csv: { mime: 'text/csv', extension: 'csv' },
  tsv: { mime: 'text/tab-separated-values', extension: 'tsv' },
  ndjson: { mime: 'application/x-ndjson', extension: 'ndjson' },
  sql: { mime: 'application/sql', extension: 'sql' },
  ts: { mime: 'text/typescript', extension: 'ts' },
  xml: { mime: 'application/xml', extension: 'xml' },
};

export interface MockExportOptions {
  /** Table name: the SQL table, XML root and TypeScript const. */
  name: string;
  sqlDialect?: SqlDialect;
}

export interface MockExport {
  text: string;
  mime: string;
  extension: string;
}

type Row = Record<string, unknown>;

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** `order_items` to `OrderItem`, `users` to `User`, `people` to `Person`. */
export function typeName(table: string): string {
  const words = table.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const last = words.pop() ?? 'row';
  const singular =
    last.toLowerCase() === 'people'
      ? 'person'
      : /ies$/i.test(last)
        ? last.slice(0, -3) + 'y'
        : /(s|x|z|ch|sh)es$/i.test(last)
          ? last.slice(0, -2)
          : /[^s]s$/i.test(last) && !/(us|is)$/i.test(last)
            ? last.slice(0, -1)
            : last;
  const pascal = [...words, singular]
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
  return /^\d/.test(pascal) ? `T${pascal}` : pascal || 'Row';
}

/** A valid const name from the table name (`order-items` to `orderItems`). */
export function constName(table: string): string {
  const words = table.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) return 'rows';
  const camel = words
    .map(
      (w, i) =>
        (i === 0 ? w[0].toLowerCase() : w[0].toUpperCase()) + w.slice(1),
    )
    .join('');
  return /^\d/.test(camel) ? `_${camel}` : camel;
}

const key = (k: string) => (IDENT.test(k) ? k : JSON.stringify(k));

/** A TypeScript type covering every sampled value. */
function typeOf(values: unknown[], indent: string): string {
  const kinds = new Set<string>();
  const objects: Row[] = [];
  const items: unknown[] = [];
  for (const v of values) {
    if (v === null || v === undefined) kinds.add('null');
    else if (Array.isArray(v)) {
      kinds.add('array');
      items.push(...v);
    } else if (typeof v === 'object') {
      kinds.add('object');
      objects.push(v as Row);
    } else kinds.add(typeof v);
  }
  const parts: string[] = [];
  for (const k of ['string', 'number', 'boolean'])
    if (kinds.has(k)) parts.push(k);
  if (kinds.has('object')) parts.push(objectType(objects, indent));
  if (kinds.has('array')) {
    const inner = items.length ? typeOf(items, indent) : 'unknown';
    parts.push(inner.includes('|') ? `(${inner})[]` : `${inner}[]`);
  }
  if (kinds.has('null')) parts.push('null');
  return parts.length ? parts.join(' | ') : 'unknown';
}

function objectType(rows: Row[], indent: string): string {
  const keys = columnsOf(rows);
  const inner = indent + '  ';
  const lines = keys.map((k) => {
    const present = rows.filter((r) => k in r);
    const optional = present.length < rows.length ? '?' : '';
    return `${inner}${key(k)}${optional}: ${typeOf(
      present.map((r) => r[k]),
      inner,
    )};`;
  });
  return `{\n${lines.join('\n')}\n${indent}}`;
}

/** An interface plus a typed `as const` fixture. */
function toTypeScript(rows: readonly Row[], name: string): string {
  const type = typeName(name);
  const sample = rows.slice(0, 1000) as Row[];
  const body = objectType(sample, '');
  return (
    `export interface ${type} ${body}\n\n` +
    `export const ${constName(name)} = ${JSON.stringify(rows, null, 2)} as const satisfies readonly ${type}[];\n`
  );
}

/** XML with the table name as root and its singular as the item element. */
function toXml(rows: readonly Row[], name: string): string {
  const safe = (s: string) =>
    /^[A-Za-z_][\w.-]*$/.test(s) && !/^xml/i.test(s) ? s : 'rows';
  const root = safe(name);
  const item = safe(typeName(root).replace(/^./, (c) => c.toLowerCase()));
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    jsonToXml({ [root]: { [item === root ? 'item' : item]: rows } }) +
    '\n'
  );
}

/** Generated rows in one of the export formats. Nested objects are
 * flattened to dotted columns for CSV, TSV and SQL. */
export function exportRows(
  rows: readonly Row[],
  format: MockExportFormat,
  opts: MockExportOptions,
): MockExport {
  const flat = () => rows.map((r) => flattenObject(r));
  let text: string;
  switch (format) {
    case 'json':
      text = JSON.stringify(rows, null, 2) + '\n';
      break;
    case 'csv':
      text = toCsv(flat());
      break;
    case 'tsv':
      text = toCsv(flat(), { delimiter: '\t' });
      break;
    case 'ndjson':
      text = toNdjson(rows);
      break;
    case 'sql':
      text = toSqlInsert(flat(), {
        table: opts.name,
        dialect: opts.sqlDialect ?? 'postgres',
      });
      break;
    case 'ts':
      text = toTypeScript(rows, opts.name);
      break;
    case 'xml':
      text = toXml(rows, opts.name);
      break;
  }
  return { text, ...INFO[format] };
}
