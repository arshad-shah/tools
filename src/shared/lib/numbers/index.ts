/**
 * Number helpers (spec §4.7, Part 6-F): BigInt base conversion, two's
 * complement and endianness, IEEE-754 decoding and word-sized bit
 * operations. Pure and worker-safe.
 */
export {
  convertFraction,
  formatInBase,
  fractionToBase,
  parseInBase,
  type FormatInBaseOptions,
  type FractionDigits,
  type ParseInBaseOptions,
} from './base';
export {
  bytesToValue,
  fromTwos,
  overflows,
  toBytes,
  toTwos,
  type WordBits,
} from './twos';
export {
  decomposeFloat,
  float32FromBits,
  float32ToBits,
  float64FromBits,
  float64ToBits,
  type FloatKind,
  type FloatParts,
} from './ieee754';
export {
  bitOp,
  permissionsToOctal,
  unixPermissions,
  type BitOperator,
} from './bits';
