import {
  flattenObject,
  jsonToXml,
  prettyXml,
  toCsv,
  toToml,
  toYaml,
  xmlToJson,
} from '@/shared/lib/data-formats';
import { ToolError } from '@/shared/lib/errors';

/** Conversions for the Convert tab (spec §7.2). */

export type ConvertTarget =
  | 'json'
  | 'json-min'
  | 'yaml'
  | 'xml'
  | 'csv'
  | 'toml';

export interface ConvertOptions {
  /** Spaces, or 'tab'. */
  indent?: number | 'tab';
  /** Root element name for JSON to XML. */
  rootName?: string;
  csvDelimiter?: string;
  crlf?: boolean;
  sortKeys?: boolean;
}

export const EXTENSIONS: Record<ConvertTarget, string> = {
  json: 'json',
  'json-min': 'json',
  yaml: 'yaml',
  xml: 'xml',
  csv: 'csv',
  toml: 'toml',
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** A copy with every object's keys sorted, at every depth. */
export function sortKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sortKeysDeep) as T;
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value).sort())
    Object.defineProperty(out, k, {
      value: sortKeysDeep(value[k]),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return out as T;
}

/** `text` as a JSON string literal, quotes included. */
export function escapeJsonString(text: string): string {
  return JSON.stringify(text);
}

/** The text of a JSON string literal; the quotes are optional. */
export function unescapeJsonString(literal: string): string {
  const t = literal.trim();
  const quoted =
    t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t : `"${t}"`;
  try {
    const v: unknown = JSON.parse(quoted);
    if (typeof v === 'string') return v;
  } catch {
    // Reported below.
  }
  throw new ToolError(
    'INVALID_INPUT',
    'This is not a valid JSON string literal',
  );
}

const isDocument = (v: unknown): v is Document =>
  typeof Document !== 'undefined' && v instanceof Document;

/** Rows for CSV: an array of objects, flattened with dotted keys. */
export function tabular(value: unknown): Record<string, unknown>[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every(isPlainObject)
  )
    throw new ToolError(
      'INVALID_INPUT',
      'Not tabular: needs an array of objects',
    );
  return value.map((row) => flattenObject(row));
}

export function isTabular(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isPlainObject);
}

export async function convert(
  input: unknown,
  target: ConvertTarget,
  opts: ConvertOptions = {},
): Promise<string> {
  const indent = opts.indent ?? 2;
  if (isDocument(input) && target === 'xml')
    return prettyXml(input, { indent: indent === 'tab' ? '\t' : indent });
  let value = isDocument(input) ? xmlToJson(input) : input;
  if (opts.sortKeys) value = sortKeysDeep(value);
  switch (target) {
    case 'json':
      return (
        JSON.stringify(value, null, indent === 'tab' ? '\t' : indent) + '\n'
      );
    case 'json-min':
      return JSON.stringify(value);
    case 'yaml':
      return toYaml(value, { indent: indent === 'tab' ? 2 : indent });
    case 'xml':
      return prettyXml(jsonToXml(value, { root: opts.rootName || 'root' }), {
        indent: indent === 'tab' ? '\t' : indent,
      });
    case 'csv':
      return toCsv(tabular(value), {
        delimiter: opts.csvDelimiter ?? ',',
        crlf: opts.crlf ?? false,
      });
    case 'toml':
      if (!isPlainObject(value))
        throw new ToolError(
          'INVALID_INPUT',
          'TOML needs an object at the top level',
        );
      return toToml(value);
  }
}
