import { ToolError } from '@/shared/lib/errors';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { newId } from '@/shared/lib/id';
import {
  migrateCollections,
  normalizeCollections,
  type Folder,
} from './collections-migrate';
import { parseCurl } from './curl';
import { emptyRequest, type HttpRequest, type KvRow } from './model';
import { importPostman, type PostmanImport } from './postman';

export const NATIVE_FORMAT = 'tools.http-client.collections';
export const HTTP_REQUEST_MIME = 'application/vnd.tools.http-request+json';
export const CURL_MIME = 'application/x-curl';

/** Collections as this tool's own JSON file. */
export function exportNative(collections: Folder[]): string {
  return JSON.stringify(
    { format: NATIVE_FORMAT, version: 2, collections },
    null,
    2,
  );
}

/**
 * Reads a collections file: this tool's JSON (v2, or the v1 array the old
 * API Request tool kept) or a Postman v2.1 collection.
 */
export function importCollectionsFile(text: string): PostmanImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'This file is not JSON', { cause });
  }
  const o = (typeof json === 'object' && json) as Record<string, unknown>;
  if (o && o.format === NATIVE_FORMAT) {
    if (typeof o.version !== 'number' || o.version > 2)
      throw new ToolError(
        'INVALID_FILE',
        'This collections file is from a newer version',
      );
    const collections = normalizeCollections(o.collections);
    return { collections, environment: null, unsupported: [] };
  }
  if (Array.isArray(json)) {
    const collections = migrateCollections(json);
    if (collections.length)
      return { collections, environment: null, unsupported: [] };
  }
  if (o && typeof o.info === 'object') return importPostman(json);
  throw new ToolError(
    'INVALID_FILE',
    'Not a Postman v2.1 or HTTP Client collections file',
  );
}

const row = (key: string, value: string): KvRow => ({
  id: newId(),
  enabled: true,
  key,
  value,
});

/** The request a hand-off carries, or null when it is not one for us. */
export function requestFromHandoff(p: HandoffPayload): HttpRequest | null {
  if (p.kind !== 'text') return null;
  if (p.mime === CURL_MIME) return parseCurl(p.text).request;
  if (p.mime === HTTP_REQUEST_MIME) {
    let v: Record<string, unknown>;
    try {
      v = JSON.parse(p.text) as Record<string, unknown>;
    } catch (cause) {
      throw new ToolError(
        'INVALID_INPUT',
        'The handed-off request is damaged',
        {
          cause,
        },
      );
    }
    if (typeof v?.url !== 'string') return null;
    const pairs = (x: unknown): KvRow[] =>
      Array.isArray(x)
        ? x
            .filter(
              (e): e is [string, string] => Array.isArray(e) && e.length === 2,
            )
            .map(([k, val]) => row(String(k), String(val)))
        : [];
    return emptyRequest({
      method: typeof v.method === 'string' ? v.method.toUpperCase() : 'GET',
      url: v.url,
      params: pairs(v.params),
      headers: pairs(v.headers),
    });
  }
  return null;
}
