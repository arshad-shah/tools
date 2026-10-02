import { detectContentKind, type ContentKind } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';

/** What decoded bytes look like ("Looks like: ...", spec §8.3). */
export interface BytesInsight {
  label: string;
  kind:
    | 'json'
    | 'jwt'
    | 'image'
    | 'text'
    | 'binary'
    | 'pdf'
    | 'archive'
    | 'media';
  mime?: string;
  details?: string;
}

const IMAGE_NAMES: Partial<Record<ContentKind, [string, string]>> = {
  png: ['PNG', 'image/png'],
  jpeg: ['JPEG', 'image/jpeg'],
  gif: ['GIF', 'image/gif'],
  webp: ['WebP', 'image/webp'],
  svg: ['SVG', 'image/svg+xml'],
};

const OTHER: Partial<
  Record<ContentKind, Pick<BytesInsight, 'label' | 'kind' | 'mime'>>
> = {
  pdf: { label: 'PDF document', kind: 'pdf', mime: 'application/pdf' },
  zip: { label: 'ZIP archive', kind: 'archive', mime: 'application/zip' },
  gzip: { label: 'Gzip archive', kind: 'archive', mime: 'application/gzip' },
  mp3: { label: 'Audio (MP3)', kind: 'media', mime: 'audio/mpeg' },
  mp4: { label: 'Video (MP4)', kind: 'media', mime: 'video/mp4' },
  webm: { label: 'Video (WebM)', kind: 'media', mime: 'video/webm' },
};

const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.length);

function jpegSize(b: Uint8Array): [number, number] | null {
  const d = view(b);
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) return null;
    const marker = b[o + 1];
    // SOF0..SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    )
      return [d.getUint16(o + 7), d.getUint16(o + 5)];
    o += 2 + d.getUint16(o + 2);
  }
  return null;
}

function webpSize(b: Uint8Array): [number, number] | null {
  if (b.length < 30) return null;
  const d = view(b);
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === 'VP8X')
    return [
      1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    ];
  if (chunk === 'VP8L') {
    const bits = d.getUint32(21, true);
    return [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)];
  }
  if (chunk === 'VP8 ')
    return [d.getUint16(26, true) & 0x3fff, d.getUint16(28, true) & 0x3fff];
  return null;
}

/** Pixel size from the image header, when the header is there. */
function imageSize(kind: ContentKind, b: Uint8Array): [number, number] | null {
  if (kind === 'png' && b.length >= 24)
    return [view(b).getUint32(16), view(b).getUint32(20)];
  if (kind === 'gif' && b.length >= 10)
    return [view(b).getUint16(6, true), view(b).getUint16(8, true)];
  if (kind === 'jpeg') return jpegSize(b);
  if (kind === 'webp') return webpSize(b);
  return null;
}

const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

function isJwt(text: string): boolean {
  const t = text.trim();
  if (!JWT_RE.test(t)) return false;
  try {
    const b64 = t.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const header: unknown = JSON.parse(atob(b64));
    return typeof header === 'object' && header !== null && 'alg' in header;
  } catch {
    return false;
  }
}

/** UTF-8 text without control characters other than whitespace. */
function asText(b: Uint8Array): string | null {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return null;
  }
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u0008\u000e-\u001f\u007f]/.test(text) ? null : text;
}

const plural = (n: number, one: string) =>
  `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`;

function jsonDetails(text: string): string {
  const v: unknown = JSON.parse(text);
  if (Array.isArray(v)) return `Array of ${plural(v.length, 'item')}`;
  if (v && typeof v === 'object')
    return `Object with ${plural(Object.keys(v).length, 'key')}`;
  return typeof v;
}

/** Classifies decoded bytes for the Base64 insight line. */
export function describeBytes(bytes: Uint8Array): BytesInsight {
  const kind = detectContentKind(bytes);
  const image = kind && IMAGE_NAMES[kind];
  if (kind && image) {
    const size = imageSize(kind, bytes);
    return {
      label: size
        ? `Image (${image[0]} ${size[0]}x${size[1]})`
        : `Image (${image[0]})`,
      kind: 'image',
      mime: image[1],
    };
  }
  if (kind === 'json') {
    const text = new TextDecoder().decode(bytes);
    return {
      label: 'JSON',
      kind: 'json',
      mime: 'application/json',
      details: jsonDetails(text),
    };
  }
  const other = kind && OTHER[kind];
  if (other) return { ...other, details: formatBytes(bytes.length) };
  const text = asText(bytes);
  if (text !== null) {
    if (isJwt(text))
      return { label: 'JWT', kind: 'jwt', mime: 'application/jwt' };
    return {
      label: 'UTF-8 text',
      kind: 'text',
      mime: 'text/plain',
      details: `${plural([...text].length, 'character')}, ${plural(text.split('\n').length, 'line')}`,
    };
  }
  return {
    label: 'Binary data',
    kind: 'binary',
    mime: 'application/octet-stream',
    details: formatBytes(bytes.length),
  };
}
