import { ToolError } from '@/shared/lib/errors';
import { ascii, concatBytes, indexOf, lastIndexOf } from './syntax';

/** Bytes reserved for the CMS signature (hex doubles it in the file). */
export const CONTENTS_PLACEHOLDER_BYTES = 16384;
/** With an RFC 3161 timestamp token inside the CMS. */
export const CONTENTS_PLACEHOLDER_BYTES_TIMESTAMP = 32768;

const BYTE_RANGE_PLACEHOLDER =
  '/ByteRange [0 0000000000 0000000000 0000000000]';
const DIGITS = 10;

/** A PDF text string: literal when printable ASCII, else UTF-16BE hex with a BOM. */
export function pdfText(s: string): string {
  if (/^[\x20-\x7e]*$/.test(s))
    return `(${s.replace(/[\\()]/g, (c) => `\\${c}`)})`;
  let hex = 'FEFF';
  for (let i = 0; i < s.length; i++)
    hex += s.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
  return `<${hex}>`;
}

const two = (n: number) => String(n).padStart(2, '0');

/** A PDF date (ISO 32000-1 §7.9.4) in the device's time zone. */
export function pdfDate(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  return (
    `D:${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}` +
    `${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}` +
    `${sign}${two(Math.floor(a / 60))}'${two(a % 60)}'`
  );
}

/** The signature dictionary object with ByteRange and Contents placeholders. */
export function sigDictBytes(
  num: number,
  o: {
    contentsBytes: number;
    name: string;
    reason?: string;
    location?: string;
    m: Date;
    subFilter: 'ETSI.CAdES.detached';
  },
): Uint8Array {
  const entries = [
    '/Type /Sig',
    '/Filter /Adobe.PPKLite',
    `/SubFilter /${o.subFilter}`,
    BYTE_RANGE_PLACEHOLDER,
    `/Contents <${'0'.repeat(o.contentsBytes * 2)}>`,
    `/M ${pdfText(pdfDate(o.m))}`,
    o.name ? `/Name ${pdfText(o.name)}` : '',
    o.reason ? `/Reason ${pdfText(o.reason)}` : '',
    o.location ? `/Location ${pdfText(o.location)}` : '',
  ].filter(Boolean);
  return ascii(`${num} 0 obj\n<< ${entries.join(' ')} >>\nendobj\n`);
}

export interface ByteRangeInfo {
  range: [number, number, number, number];
  /** Offset of the "<" that opens the signature value. */
  contentsStart: number;
  /** Offset just after the closing ">". */
  contentsEnd: number;
}

const noPlaceholder = () =>
  new ToolError(
    'SIGNATURE_INVALID',
    'The space for the signature could not be found in the file',
  );

/**
 * Finds the last ByteRange placeholder and the /Contents after it, then
 * writes the real ranges in place (same width, so no offset moves). The
 * signed bytes are everything except the /Contents hex string, brackets
 * included (ISO 32000-1 §12.8.1).
 */
export function locateAndPatchByteRange(file: Uint8Array): ByteRangeInfo {
  const at = lastIndexOf(file, BYTE_RANGE_PLACEHOLDER);
  if (at < 0) throw noPlaceholder();
  const c = indexOf(file, '/Contents <', at);
  if (c < 0) throw noPlaceholder();
  const contentsStart = c + '/Contents '.length;
  const close = indexOf(file, '>', contentsStart);
  if (close < 0) throw noPlaceholder();
  const contentsEnd = close + 1;
  const range: ByteRangeInfo['range'] = [
    0,
    contentsStart,
    contentsEnd,
    file.length - contentsEnd,
  ];
  const nums = range
    .slice(1)
    .map((n) => {
      const s = String(n);
      if (s.length > DIGITS) throw noPlaceholder();
      return s.padEnd(DIGITS, ' ');
    })
    .join(' ');
  file.set(ascii(`/ByteRange [0 ${nums}]`), at);
  return { range, contentsStart, contentsEnd };
}

/** The bytes a signature covers: the file without the /Contents value. */
export function signedContent(file: Uint8Array, r: ByteRangeInfo): Uint8Array {
  return concatBytes([
    file.subarray(0, r.contentsStart),
    file.subarray(r.contentsEnd),
  ]);
}

export const DID_NOT_FIT =
  'The signature did not fit in the space reserved for it';

/** Writes the DER signature into the placeholder (upper-case hex, zero padded). */
export function insertSignature(
  file: Uint8Array,
  r: ByteRangeInfo,
  der: Uint8Array,
): Uint8Array {
  const room = r.contentsEnd - r.contentsStart - 2;
  if (der.length * 2 > room)
    throw new ToolError('SIGNATURE_INVALID', DID_NOT_FIT);
  let hex = '';
  for (const b of der) hex += b.toString(16).toUpperCase().padStart(2, '0');
  const out = file.slice();
  out.set(ascii(hex.padEnd(room, '0')), r.contentsStart + 1);
  return out;
}
