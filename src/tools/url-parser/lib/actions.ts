import type { HandoffPayload } from '@/shared/lib/handoff';
import type { UrlModel } from './model';
import { buildUrl } from './build';

export const HTTP_REQUEST_MIME = 'application/vnd.tools.http-request+json';

/**
 * "Send to HTTP Client": a GET of the URL without its query (the params go
 * as rows) and without the fragment, which is never sent.
 */
export function toHttpClient(m: UrlModel): HandoffPayload {
  const url = buildUrl({ ...m, params: [], hash: '' });
  return {
    kind: 'text',
    mime: HTTP_REQUEST_MIME,
    sourceTool: 'url-parser',
    text: JSON.stringify({
      method: 'GET',
      url,
      params: m.params.filter((p) => p.enabled).map((p) => [p.key, p.value]),
    }),
  };
}

/** "Make QR" and "Open in Text Encoder": the URL as text/uri-list. */
export function asUriList(url: string): HandoffPayload {
  return {
    kind: 'text',
    mime: 'text/uri-list',
    sourceTool: 'url-parser',
    text: url,
  };
}

/** The URL from a hand-off (`text/uri-list` may hold comments and several). */
export function urlFromHandoff(p: HandoffPayload): string | null {
  if (p.kind !== 'text') return null;
  if (p.mime === 'text/uri-list')
    return (
      p.text
        .split(/\r?\n/)
        .find((l) => l.trim() && !l.startsWith('#'))
        ?.trim() ?? null
    );
  if (p.mime === 'text/plain') return p.text.trim() || null;
  return null;
}
