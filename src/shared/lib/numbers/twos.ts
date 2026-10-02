import { ToolError } from '@/shared/lib/errors';

/** Word sizes the converters and programmer mode offer. */
export type WordBits = 8 | 16 | 32 | 64;

/** The unsigned bit pattern of `value` at `bits` (two's complement). */
export const toTwos = (value: bigint, bits: number): bigint =>
  BigInt.asUintN(bits, value);

/** The signed value an unsigned `bits`-wide pattern stands for. */
export const fromTwos = (raw: bigint, bits: number): bigint =>
  BigInt.asIntN(bits, raw);

/** Whether `value` falls outside the `bits`-wide signed or unsigned range. */
export function overflows(
  value: bigint,
  bits: number,
  signed: boolean,
): boolean {
  const b = BigInt(bits);
  if (signed) {
    const half = 1n << (b - 1n);
    return value < -half || value >= half;
  }
  return value < 0n || value >= 1n << b;
}

/** The `bits`-wide pattern of `value` as bytes, big- or little-endian. */
export function toBytes(
  value: bigint,
  bits: number,
  endian: 'be' | 'le',
): Uint8Array<ArrayBuffer> {
  if (bits % 8 !== 0)
    throw new ToolError('INVALID_INPUT', `${bits} bits is not whole bytes`);
  let raw = toTwos(value, bits);
  const out = new Uint8Array(bits / 8);
  for (let i = out.length - 1; i >= 0; i--) {
    out[i] = Number(raw & 0xffn);
    raw >>= 8n;
  }
  return endian === 'le' ? out.reverse() : out;
}

/** The unsigned value of bytes read big- or little-endian. */
export function bytesToValue(bytes: Uint8Array, endian: 'be' | 'le'): bigint {
  const ordered = endian === 'le' ? Array.from(bytes).reverse() : bytes;
  let v = 0n;
  for (const b of ordered) v = (v << 8n) | BigInt(b);
  return v;
}
