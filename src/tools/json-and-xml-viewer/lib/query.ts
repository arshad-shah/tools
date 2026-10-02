import { toToolError, type ToolError } from '@/shared/lib/errors';
import { queryJsonPath } from './jsonpath';
import { toJsonPath } from './paths';
import { queryXPath } from './xpath';

/** One query result: the doc id ('' for a computed value) and its text. */
export interface QueryRow {
  id: string;
  path: string;
  preview: string;
  /** The value as JSON-able data, for "Copy results as JSON". */
  value: unknown;
}

const PREVIEW_MAX = 120;
const ELLIPSIS = String.fromCodePoint(0x2026);

function preview(v: unknown): string {
  const s =
    typeof v === 'string' ? JSON.stringify(v) : (JSON.stringify(v) ?? 'null');
  return s.length > PREVIEW_MAX ? s.slice(0, PREVIEW_MAX - 1) + ELLIPSIS : s;
}

export type QueryOutcome =
  | { ok: true; rows: QueryRow[] }
  | { ok: false; error: ToolError };

/** JSONPath over a JSON value, or XPath over an XML document. */
export function runQuery(
  expr: string,
  source: { value: unknown; xml: Document | null },
): QueryOutcome {
  try {
    if (source.xml) {
      const rows = queryXPath(source.xml, expr).map((r) => ({
        id: r.nodeId,
        path: r.nodeId || expr,
        preview:
          r.text.length > PREVIEW_MAX
            ? r.text.slice(0, PREVIEW_MAX - 1) + ELLIPSIS
            : r.text,
        value: r.text,
      }));
      return { ok: true, rows };
    }
    const rows = queryJsonPath(source.value, expr).map((r) => {
      const path = toJsonPath(r.path);
      return { id: path, path, preview: preview(r.value), value: r.value };
    });
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: toToolError(e) };
  }
}
