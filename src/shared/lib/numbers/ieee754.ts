/** IEEE-754 binary32 and binary64 bit patterns (spec §4.7). */

const view = new DataView(new ArrayBuffer(8));

/** The float32 a 32-bit pattern encodes. */
export function float32FromBits(raw: number): number {
  view.setUint32(0, raw >>> 0);
  return view.getFloat32(0);
}

/** The 32-bit pattern of a number rounded to float32. */
export function float32ToBits(value: number): number {
  view.setFloat32(0, value);
  return view.getUint32(0);
}

/** The float64 a 64-bit pattern encodes. */
export function float64FromBits(raw: bigint): number {
  view.setBigUint64(0, BigInt.asUintN(64, raw));
  return view.getFloat64(0);
}

/** The 64-bit pattern of a number. */
export function float64ToBits(value: number): bigint {
  view.setFloat64(0, value);
  return view.getBigUint64(0);
}

export type FloatKind = 'normal' | 'subnormal' | 'zero' | 'inf' | 'nan';

export interface FloatParts {
  sign: 0 | 1;
  /** The biased exponent field. */
  exponent: number;
  /** The exponent after removing the bias (subnormals use 1 - bias). */
  unbiased: number;
  /** The fraction (mantissa) field without the implicit leading bit. */
  mantissa: bigint;
  exponentBits: number;
  mantissaBits: number;
  value: number;
  kind: FloatKind;
}

/** Splits a float bit pattern into sign, exponent and mantissa fields. */
export function decomposeFloat(
  bits: 32 | 64,
  raw: number | bigint,
): FloatParts {
  const r = BigInt.asUintN(bits, BigInt(raw));
  const exponentBits = bits === 32 ? 8 : 11;
  const mantissaBits = bits === 32 ? 23 : 52;
  const bias = (1 << (exponentBits - 1)) - 1;
  const sign = Number(r >> BigInt(bits - 1)) as 0 | 1;
  const exponent = Number(
    (r >> BigInt(mantissaBits)) & ((1n << BigInt(exponentBits)) - 1n),
  );
  const mantissa = r & ((1n << BigInt(mantissaBits)) - 1n);
  const maxExp = (1 << exponentBits) - 1;
  let kind: FloatKind;
  if (exponent === maxExp) kind = mantissa === 0n ? 'inf' : 'nan';
  else if (exponent === 0) kind = mantissa === 0n ? 'zero' : 'subnormal';
  else kind = 'normal';
  const value = bits === 32 ? float32FromBits(Number(r)) : float64FromBits(r);
  return {
    sign,
    exponent,
    unbiased: exponent === 0 ? 1 - bias : exponent - bias,
    mantissa,
    exponentBits,
    mantissaBits,
    value,
    kind,
  };
}
