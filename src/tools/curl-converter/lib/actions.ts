import type { HandoffPayload } from '@/shared/lib/handoff';
import { toCurl } from './gen-curl';
import type { CurlRequest } from './model';

export const CURL_MIME = 'application/x-curl';
const TOOL_ID = 'curl-converter';

/** The mimes this tool takes as a text hand-off. */
export const ACCEPTED_MIMES = [CURL_MIME, 'text/plain'];

/**
 * "Send to HTTP Client": the request as a tidy bash curl command, which the
 * HTTP Client imports with its headers, body and basic auth (its JSON
 * request hand-off carries no body).
 */
export function toHttpClient(req: CurlRequest): HandoffPayload {
  return {
    kind: 'text',
    mime: CURL_MIME,
    sourceTool: TOOL_ID,
    text: toCurl(req),
  };
}

/** The command text a hand-off carries, or null when it is not one for us. */
export function curlFromHandoff(p: HandoffPayload): string | null {
  if (p.kind !== 'text' || !ACCEPTED_MIMES.includes(p.mime)) return null;
  return p.text;
}
