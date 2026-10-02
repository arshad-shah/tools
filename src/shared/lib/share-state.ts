import { deflateSync, Inflate } from 'fflate';
import {
  base64UrlToBytes,
  bytesToBase64,
  utf8Decode,
  utf8Encode,
} from './encoding';
import { ToolError } from './errors';

/**
 * Tool state in a URL fragment (spec §4.2): `#s=1.<payload>` where payload
 * is Base64url(deflateRaw(utf8(JSON.stringify({ v, s })))). The fragment is
 * never sent to a server.
 */

/** Serialised JSON cap before compression. */
export const SHARE_JSON_MAX = 65_536;
/** Encoded fragment cap when sharing (a link that fits in chat apps). */
export const SHARE_FRAGMENT_MAX = 6_000;
/** Decoding refuses longer fragments. */
export const SHARE_DECODE_FRAGMENT_MAX = 16_000;
/** Zip-bomb guard: decompressed JSON cap when decoding. */
export const SHARE_DECODE_JSON_MAX = 262_144;

const CODEC = 1;
const PREFIX = `s=${CODEC}.`;

export type EncodeShareResult =
  | { ok: true; fragment: string }
  | { ok: false; reason: 'too-large'; size: number };

export function encodeShare(
  state: unknown,
  version: number,
): EncodeShareResult {
  const json = JSON.stringify({ v: version, s: state });
  const bytes = utf8Encode(json);
  if (bytes.length > SHARE_JSON_MAX)
    return { ok: false, reason: 'too-large', size: bytes.length };
  const payload = bytesToBase64(deflateSync(bytes, { level: 9 }), {
    urlSafe: true,
    padding: false,
  });
  const fragment = PREFIX + payload;
  if (fragment.length > SHARE_FRAGMENT_MAX)
    return { ok: false, reason: 'too-large', size: fragment.length };
  return { ok: true, fragment };
}

const damaged = (cause?: unknown) =>
  new ToolError(
    'INVALID_INPUT',
    'This share link is damaged or from a newer version',
    { cause },
  );

/** Inflates raw DEFLATE, aborting as soon as the output passes `max`. */
function inflateCapped(data: Uint8Array, max: number): Uint8Array {
  const chunks: Uint8Array[] = [];
  let size = 0;
  const inflate = new Inflate((chunk) => {
    size += chunk.length;
    if (size > max)
      throw damaged(new Error('Decompressed share data too large'));
    chunks.push(chunk);
  });
  inflate.push(data, true);
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/**
 * Reads a fragment made by `encodeShare` (a leading `#` is allowed). Every
 * failure, including an unknown codec version, is INVALID_INPUT.
 */
export function decodeShare(fragment: string): {
  version: number;
  state: unknown;
} {
  const f = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  if (!f.startsWith(PREFIX) || f.length > SHARE_DECODE_FRAGMENT_MAX)
    throw damaged();
  try {
    const bytes = inflateCapped(
      base64UrlToBytes(f.slice(PREFIX.length)),
      SHARE_DECODE_JSON_MAX,
    );
    const env = JSON.parse(utf8Decode(bytes)) as { v?: unknown; s?: unknown };
    if (
      typeof env !== 'object' ||
      env === null ||
      typeof env.v !== 'number' ||
      !('s' in env)
    )
      throw new Error('Not a share envelope');
    return { version: env.v, state: env.s };
  } catch (cause) {
    throw damaged(cause);
  }
}
