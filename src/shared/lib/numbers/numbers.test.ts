import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import {
  bitOp,
  bytesToValue,
  convertFraction,
  decomposeFloat,
  float32FromBits,
  float32ToBits,
  float64FromBits,
  float64ToBits,
  formatInBase,
  fractionToBase,
  fromTwos,
  overflows,
  parseInBase,
  permissionsToOctal,
  toBytes,
  toTwos,
  unixPermissions,
} from './index';

const errorOf = (fn: () => unknown): ToolError => {
  try {
    fn();
  } catch (e) {
    return e as ToolError;
  }
  throw new Error('expected a throw');
};

describe('parseInBase', () => {
  it('keeps precision beyond 2^53', () => {
    expect(parseInBase('0xFFFF_FFFF_FFFF_FFFF', 16).value).toBe(
      18446744073709551615n,
    );
  });
  it('accepts prefixes, separators and a sign', () => {
    expect(parseInBase('0b1010', 2).value).toBe(10n);
    expect(parseInBase('0o17', 8).value).toBe(15n);
    expect(parseInBase('-ff', 16).value).toBe(-255n);
    expect(parseInBase('1 000 000', 10).value).toBe(1_000_000n);
    expect(parseInBase('+z', 36).value).toBe(35n);
  });
  it('reads a fraction', () => {
    expect(parseInBase('10.11', 2)).toEqual({ value: 2n, fraction: '11' });
    expect(parseInBase('.5', 10)).toEqual({ value: 0n, fraction: '5' });
  });
  it('refuses prefixes when not allowed and a prefix for another base', () => {
    expect(
      errorOf(() => parseInBase('0x1', 16, { allowPrefix: false })).code,
    ).toBe('INVALID_INPUT');
    expect(errorOf(() => parseInBase('0x1', 10)).message).toBe(
      'Digit x is not valid in base 10 at position 2',
    );
  });
  it('names the digit, base and 1-based position', () => {
    const e = errorOf(() => parseInBase('179', 8));
    expect(e.code).toBe('INVALID_INPUT');
    expect(e.message).toBe('Digit 9 is not valid in base 8 at position 3');
    expect(errorOf(() => parseInBase('FG', 16)).message).toBe(
      'Digit G is not valid in base 16 at position 2',
    );
    expect(errorOf(() => parseInBase('', 10)).message).toMatch(/Enter/);
    expect(errorOf(() => parseInBase('1.2.3', 10)).message).toBe(
      'Digit . is not valid in base 10 at position 4',
    );
  });
  it('refuses bases outside 2 to 36', () => {
    expect(errorOf(() => parseInBase('1', 37)).code).toBe('INVALID_INPUT');
  });
});

describe('formatInBase', () => {
  it('groups digits from the right', () => {
    expect(formatInBase(255n, 2, { group: 4 })).toBe('1111 1111');
    expect(formatInBase(1234567n, 10, { group: 3 })).toBe('1 234 567');
  });
  it('adds a prefix and chooses case', () => {
    expect(formatInBase(255n, 16, { prefix: true })).toBe('0xFF');
    expect(formatInBase(255n, 16, { upper: false })).toBe('ff');
    expect(formatInBase(-8n, 8, { prefix: true })).toBe('-0o10');
    expect(formatInBase(0n, 2)).toBe('0');
  });
});

describe('fractions', () => {
  it('detects a repeating binary fraction', () => {
    const r = fractionToBase('0.1', 2, 20);
    expect(r.repeating).toBe(true);
    expect(r.digits).toBe('00011001100110011001');
  });
  it('ends a terminating fraction', () => {
    expect(fractionToBase('0.5', 2, 20)).toEqual({
      digits: '1',
      repeating: false,
    });
    expect(fractionToBase('.75', 16, 8)).toEqual({
      digits: 'C',
      repeating: false,
    });
  });
  it('converts fraction digits between bases', () => {
    expect(convertFraction('11', 2, 10, 10)).toEqual({
      digits: '75',
      repeating: false,
    });
  });
});

describe("two's complement and bytes", () => {
  it('round-trips', () => {
    expect(toTwos(-1n, 8)).toBe(255n);
    expect(fromTwos(255n, 8)).toBe(-1n);
    expect(fromTwos(127n, 8)).toBe(127n);
    expect(toTwos(-128n, 8)).toBe(128n);
  });
  it('detects overflow', () => {
    expect(overflows(128n, 8, true)).toBe(true);
    expect(overflows(127n, 8, true)).toBe(false);
    expect(overflows(-129n, 8, true)).toBe(true);
    expect(overflows(255n, 8, false)).toBe(false);
    expect(overflows(256n, 8, false)).toBe(true);
    expect(overflows(-1n, 8, false)).toBe(true);
  });
  it('orders bytes by endianness', () => {
    expect(Array.from(toBytes(0x1234n, 16, 'le'))).toEqual([0x34, 0x12]);
    expect(Array.from(toBytes(0x1234n, 16, 'be'))).toEqual([0x12, 0x34]);
    expect(Array.from(toBytes(-1n, 32, 'be'))).toEqual([255, 255, 255, 255]);
    expect(bytesToValue(new Uint8Array([0x34, 0x12]), 'le')).toBe(0x1234n);
  });
});

describe('IEEE-754', () => {
  it('reads float bit patterns', () => {
    expect(float32FromBits(0x3f800000)).toBe(1);
    expect(float64FromBits(0x3ff0000000000000n)).toBe(1);
    expect(float32ToBits(1)).toBe(0x3f800000);
    expect(float64ToBits(-2)).toBe(0xc000000000000000n);
  });
  it('decomposes floats by kind', () => {
    expect(decomposeFloat(32, 0x00000001).kind).toBe('subnormal');
    const one = decomposeFloat(32, 0x3f800000);
    expect(one).toMatchObject({
      sign: 0,
      exponent: 127,
      unbiased: 0,
      mantissa: 0n,
      value: 1,
      kind: 'normal',
    });
    expect(decomposeFloat(32, 0x80000000).kind).toBe('zero');
    expect(decomposeFloat(32, 0x7f800000).kind).toBe('inf');
    expect(decomposeFloat(32, 0x7fc00000).kind).toBe('nan');
    expect(decomposeFloat(64, 0xbff8000000000000n)).toMatchObject({
      sign: 1,
      value: -1.5,
      kind: 'normal',
    });
  });
});

describe('bitOp', () => {
  it('rotates within the word', () => {
    expect(bitOp('rotl', 0x81n, 1n, 8, false)).toBe(0x03n);
    expect(bitOp('rotr', 0x03n, 1n, 8, false)).toBe(0x81n);
  });
  it('applies logic operators at the word size', () => {
    expect(bitOp('and', 0xf0n, 0x3cn, 8, false)).toBe(0x30n);
    expect(bitOp('or', 0xf0n, 0x0fn, 8, false)).toBe(0xffn);
    expect(bitOp('xor', 0xffn, 0x0fn, 8, false)).toBe(0xf0n);
    expect(bitOp('nand', 0xffn, 0xffn, 8, false)).toBe(0n);
    expect(bitOp('nor', 0n, 0n, 8, false)).toBe(0xffn);
    expect(bitOp('not', 0n, 0n, 16, true)).toBe(-1n);
  });
  it('shifts logically and arithmetically', () => {
    expect(bitOp('shl', 0x81n, 1n, 8, false)).toBe(0x02n);
    expect(bitOp('shr', -2n, 1n, 8, true)).toBe(127n);
    expect(bitOp('sar', -2n, 1n, 8, true)).toBe(-1n);
  });
});

describe('Unix permissions', () => {
  it('converts octal to symbolic and back', () => {
    expect(unixPermissions('750')).toBe('rwxr-x---');
    expect(permissionsToOctal('rwxr-x---')).toBe('750');
    for (const o of ['000', '644', '755', '777', '4755', '1777', '2750'])
      expect(permissionsToOctal(unixPermissions(o))).toBe(o);
    expect(unixPermissions('4755')).toBe('rwsr-xr-x');
    expect(unixPermissions('1776')).toBe('rwxrwxrwT');
  });
  it('rejects malformed input', () => {
    expect(errorOf(() => unixPermissions('8')).code).toBe('INVALID_INPUT');
    expect(errorOf(() => permissionsToOctal('rwz')).code).toBe('INVALID_INPUT');
  });
});
