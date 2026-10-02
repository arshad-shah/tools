import {
  base64ToBytes,
  bytesToBase64,
  parseDataUri,
  utf8Decode,
  utf8Encode,
} from '@/shared/lib/encoding';
import { detectKind, type FileKind } from '@/shared/lib/files';

export interface EncodeOptions {
  urlSafe: boolean;
  /** `=` padding; defaults to on for standard and off for URL-safe. */
  padding?: boolean;
  /** Break lines at 76 characters (MIME, RFC 2045). */
  wrap76?: boolean;
}

const wrap = (s: string, on?: boolean) =>
  on ? (s.match(/.{1,76}/g) ?? []).join('\n') : s;

export function encodeText(
  text: string,
  { urlSafe, padding = !urlSafe, wrap76 }: EncodeOptions,
): string {
  return wrap(bytesToBase64(utf8Encode(text), { urlSafe, padding }), wrap76);
}

export function encodeBytes(
  bytes: Uint8Array,
  mime: string,
  { urlSafe, padding = !urlSafe, wrap76 }: EncodeOptions,
): { base64: string; dataUri: string } {
  // A data URI always uses the standard alphabet (RFC 2397), unwrapped.
  const standard = bytesToBase64(bytes);
  return {
    base64: wrap(
      urlSafe || !padding
        ? bytesToBase64(bytes, { urlSafe, padding })
        : standard,
      wrap76,
    ),
    dataUri: `data:${mime};base64,${standard}`,
  };
}

/** Above this many characters a textarea gets only a preview. */
export const PREVIEW_THRESHOLD = 1_000_000;
/** How much of a long result the preview shows. */
export const PREVIEW_LENGTH = 64 * 1024;

/**
 * What to put in a textarea: the whole text, or its start when it is too
 * long to render. Copy and Download always use the full text.
 */
export function preview(
  text: string,
  threshold = PREVIEW_THRESHOLD,
): { text: string; truncated: boolean } {
  if (text.length <= threshold) return { text, truncated: false };
  return {
    text: text.slice(0, Math.min(PREVIEW_LENGTH, threshold)),
    truncated: true,
  };
}

export interface Decoded {
  bytes: Uint8Array;
  /** The UTF-8 text, or null when the bytes are not text. */
  text: string | null;
  mime: string;
}

/** Decodes Base64 (standard or URL-safe) or a `data:` URI. */
export function decodeInput(input: string): Decoded {
  const uri = parseDataUri(input);
  const bytes = uri ? uri.bytes : base64ToBytes(input);
  const { mime } = guessFileType(bytes, uri?.mime);
  return { bytes, text: asText(bytes), mime };
}

const asText = (bytes: Uint8Array): string | null => {
  let text: string;
  try {
    text = utf8Decode(bytes);
  } catch {
    return null;
  }
  // Valid UTF-8 can still be binary: control characters other than
  // whitespace mean it is not something to show as text.
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u0008\u000e-\u001f\u007f]/.test(text) ? null : text;
};

const KIND_TYPES: Record<FileKind, { mime: string; ext: string }> = {
  pdf: { mime: 'application/pdf', ext: 'pdf' },
  png: { mime: 'image/png', ext: 'png' },
  jpeg: { mime: 'image/jpeg', ext: 'jpg' },
  webp: { mime: 'image/webp', ext: 'webp' },
  gif: { mime: 'image/gif', ext: 'gif' },
};

const MIME_EXT: Record<string, string> = {
  'application/json': 'json',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/csv': 'csv',
  'text/html': 'html',
  'text/plain': 'txt',
  'image/svg+xml': 'svg',
  'application/zip': 'zip',
};

/** Sniffed type first (content wins), then the hint, then text or binary. */
export function guessFileType(
  bytes: Uint8Array,
  hint?: string,
): { mime: string; ext: string } {
  const kind = detectKind(bytes);
  if (kind) return KIND_TYPES[kind];
  const mime = hint?.split(';')[0].trim().toLowerCase();
  if (mime && mime !== 'text/plain')
    return { mime, ext: MIME_EXT[mime] ?? 'bin' };
  if (asText(bytes) !== null) return { mime: 'text/plain', ext: 'txt' };
  return { mime: 'application/octet-stream', ext: 'bin' };
}
