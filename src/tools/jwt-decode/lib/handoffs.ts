import type { HandoffPayload } from '@/shared/lib/handoff';
import type { DecodedJWT } from '../types';

const TOOL = 'jwt-decode';

/** JSON with object keys sorted at every level, so diffs line up. */
export function sortedJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
      );
    return v;
  };
  return JSON.stringify(sort(value), null, 2);
}

/** "Open payload in JSON Viewer". */
export const payloadToJson = (token: DecodedJWT): HandoffPayload => ({
  kind: 'text',
  mime: 'application/json',
  text: JSON.stringify(token.payload, null, 2),
  sourceTool: TOOL,
  filename: 'jwt-payload.json',
});

/**
 * "Compare with another token": both payloads, keys sorted, as one Text
 * Diff pair (application/vnd.tools.diff-pair+json, spec §10).
 */
export const comparePayloads = (
  left: DecodedJWT,
  right: DecodedJWT,
): HandoffPayload => ({
  kind: 'text',
  mime: 'application/vnd.tools.diff-pair+json',
  text: JSON.stringify({
    left: sortedJson(left.payload),
    right: sortedJson(right.payload),
  }),
  sourceTool: TOOL,
  meta: { pair: true },
});

/** `exp` or `iat` seconds for the Epoch converter (text/plain). */
export function claimToEpoch(
  token: DecodedJWT,
  claim: 'exp' | 'iat' | 'nbf',
): HandoffPayload | null {
  const v = token.payload[claim];
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return {
    kind: 'text',
    mime: 'text/plain',
    text: String(v),
    sourceTool: TOOL,
  };
}

/** A hand-off this tool accepts: a token from another tool. */
export const isTokenHandoff = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'application/jwt';
