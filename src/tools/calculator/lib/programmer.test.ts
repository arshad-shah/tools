import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { programmerEval } from './programmer';

const u8 = { bits: 8, signed: false, base: 16 } as const;

describe('programmerEval', () => {
  it('wraps results to the word size', () => {
    expect(programmerEval('0xFF + 1', u8)).toBe(0n);
    expect(programmerEval('1 << 70', { ...u8, bits: 64 })).toBe(0n);
    expect(programmerEval('0 - 1', u8)).toBe(255n);
    expect(programmerEval('127 + 1', { bits: 8, signed: true, base: 10 })).toBe(
      -128n,
    );
  });
  it('reads signed words', () => {
    expect(programmerEval('~0', { bits: 16, signed: true, base: 10 })).toBe(
      -1n,
    );
    expect(programmerEval('-8 >> 1', { bits: 8, signed: true, base: 10 })).toBe(
      -4n,
    );
    expect(
      programmerEval('-8 >>> 1', { bits: 8, signed: true, base: 10 }),
    ).toBe(124n);
  });
  it('calls rotate and logic functions', () => {
    expect(programmerEval('rotl(0x81, 1)', u8)).toBe(3n);
    expect(programmerEval('rotr(3, 1)', u8)).toBe(0x81n);
    expect(programmerEval('nand(ff, f0)', u8)).toBe(0x0fn);
    expect(programmerEval('nor(0, 0)', u8)).toBe(0xffn);
  });
  it('reads numbers in the current base or with a prefix', () => {
    expect(programmerEval('ff & 0b1111', u8)).toBe(15n);
    expect(programmerEval('17', { bits: 8, signed: false, base: 8 })).toBe(15n);
    expect(
      programmerEval('101 | 0o2', { bits: 8, signed: false, base: 2 }),
    ).toBe(7n);
  });
  it('follows C precedence with parentheses', () => {
    const d = { bits: 32, signed: true, base: 10 } as const;
    expect(programmerEval('1 + 2 * 3', d)).toBe(7n);
    expect(programmerEval('(1 + 2) * 3', d)).toBe(9n);
    expect(programmerEval('1 | 2 ^ 3 & 4', d)).toBe(3n);
    expect(programmerEval('1 << 2 + 1', d)).toBe(8n);
    expect(programmerEval('7 / 2 % 2', d)).toBe(1n);
    expect(programmerEval('-7 / 2', d)).toBe(-3n);
  });
  it('reports division by zero and bad input as INVALID_INPUT', () => {
    for (const expr of ['1 / 0', '5 % 0', '1 +', 'foo(1)', '2 3', '(1'])
      expect(() => programmerEval(expr, u8)).toThrow(ToolError);
    try {
      programmerEval('1 / 0', u8);
    } catch (e) {
      expect((e as ToolError).code).toBe('INVALID_INPUT');
      expect((e as ToolError).message).toBe('Division by zero');
    }
    expect(() =>
      programmerEval('9', { bits: 8, signed: false, base: 8 }),
    ).toThrow(/not valid in base 8/);
  });
});
