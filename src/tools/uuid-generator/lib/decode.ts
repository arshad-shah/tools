import { ulidTime } from './ulid';
import { uuidToBytes } from './uuid';

export type DecodedId =
  | {
      kind: 'uuid';
      version: number;
      variant: 'RFC 9562' | 'NCS' | 'Microsoft' | 'Future';
      /** Unix ms, for time-based versions (1, 6, 7). */
      timestamp?: number;
      special?: 'nil' | 'max';
    }
  | { kind: 'ulid'; timestamp: number }
  | { kind: 'unknown' };

/** 100 ns intervals from 1582-10-15 (Gregorian) to 1970-01-01. */
const GREGORIAN_OFFSET = 0x01b21dd213814000n;

const gregorianMs = (t: bigint) => Number((t - GREGORIAN_OFFSET) / 10_000n);

function variantOf(b: number): Extract<DecodedId, { kind: 'uuid' }>['variant'] {
  if ((b & 0x80) === 0) return 'NCS';
  if ((b & 0xc0) === 0x80) return 'RFC 9562';
  if ((b & 0xe0) === 0xc0) return 'Microsoft';
  return 'Future';
}

/** What a pasted UUID or ULID says: version, variant and time. */
export function decodeId(text: string): DecodedId {
  const b = uuidToBytes(text);
  if (!b) {
    const t = ulidTime(text);
    return t === null ? { kind: 'unknown' } : { kind: 'ulid', timestamp: t };
  }
  if (b.every((x) => x === 0))
    return { kind: 'uuid', version: 0, variant: 'NCS', special: 'nil' };
  if (b.every((x) => x === 0xff))
    return { kind: 'uuid', version: 15, variant: 'Future', special: 'max' };
  const version = b[6] >> 4;
  const out: DecodedId = { kind: 'uuid', version, variant: variantOf(b[8]) };
  const n = (i: number, len: number) => {
    let v = 0n;
    for (let k = i; k < i + len; k++) v = (v << 8n) | BigInt(b[k]);
    return v;
  };
  if (version === 7) out.timestamp = Number(n(0, 6));
  else if (version === 1) {
    const low = n(0, 4);
    const mid = n(4, 2);
    const high = n(6, 2) & 0x0fffn;
    out.timestamp = gregorianMs((high << 48n) | (mid << 32n) | low);
  } else if (version === 6) {
    const high = n(0, 4);
    const mid = n(4, 2);
    const low = n(6, 2) & 0x0fffn;
    out.timestamp = gregorianMs((high << 28n) | (mid << 12n) | low);
  }
  return out;
}
