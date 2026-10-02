import { toToolError, type ToolError } from '@/shared/lib/errors';
import type { KillableClient } from '@/shared/lib/killable-client';
import type { TextHandlers } from '@/shared/workers/handlers';
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

/** JSONPath rows over a JSON value; throws a positioned ToolError. */
export function jsonQueryRows(value: unknown, expr: string): QueryRow[] {
  return queryJsonPath(value, expr).map((r) => {
    const path = toJsonPath(r.path);
    return { id: path, path, preview: preview(r.value), value: r.value };
  });
}

/** JSONPath over a JSON value, or XPath over an XML document (sync). */
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
    return { ok: true, rows: jsonQueryRows(source.value, expr) };
  } catch (e) {
    return { ok: false, error: toToolError(e) };
  }
}

/**
 * Like `runQuery`, but JSONPath runs on the text worker (`json.query`,
 * spec 4.4) so a large document never blocks typing. XPath needs the DOM
 * and stays here; without a Worker (tests) JSONPath runs in place too.
 */
export async function runQueryOffThread(
  expr: string,
  source: { value: unknown; xml: Document | null },
  worker: () => KillableClient<TextHandlers>,
): Promise<QueryOutcome> {
  if (source.xml || typeof Worker === 'undefined')
    return runQuery(expr, source);
  try {
    const rows = await worker().call('json.query', [source.value, expr]);
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: toToolError(e) };
  }
}
