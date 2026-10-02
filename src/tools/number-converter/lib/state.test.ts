import { describe, expect, it } from 'vitest';
import { byteName, deriveAll, type DeriveOptions } from './state';

const opts = (o: Partial<DeriveOptions> = {}): DeriveOptions => ({
  bits: 32,
  signed: false,
  customBase: 36,
  fractionPrecision: 20,
  ...o,
});

describe('deriveAll', () => {
  it('reads the 8-bit pattern of 255 as -1 when signed', () => {
    const d = deriveAll(255n, opts({ bits: 8, signed: true }));
    expect(d.dec).toBe('-1');
    expect(d.hex).toBe('FF');
    expect(d.bin).toBe('11111111');
    expect(d.overflow).toBe(false);
    expect(deriveAll(-1n, opts({ bits: 8 })).hex).toBe('FF');
  });
  it('keeps 64-bit precision', () => {
    const d = deriveAll(0xffffffffffffffffn, opts({ bits: 64 }));
    expect(d.dec).toBe('18446744073709551615');
    expect(d.custom).toBe('3W5E11264SGSF');
  });
  it('flags values that do not fit', () => {
    const d = deriveAll(256n, opts({ bits: 8 }));
    expect(d.overflow).toBe(true);
    expect(d.dec).toBe('0');
    expect(deriveAll(-129n, opts({ bits: 8, signed: true })).overflow).toBe(
      true,
    );
  });
  it('shows bytes in both orders with character readouts', () => {
    const d = deriveAll(0x4869n, opts({ bits: 16 }));
    expect(d.bytesBE).toBe('48 69');
    expect(d.bytesLE).toBe('69 48');
    expect(d.ascii).toEqual(['H', 'i']);
    expect(d.utf8).toBe('Hi');
    expect(deriveAll(0x0an, opts({ bits: 8 })).ascii).toEqual(['LF']);
    expect(deriveAll(0xffn, opts({ bits: 8 })).utf8).toBeNull();
  });
  it('decodes floats and permissions', () => {
    expect(deriveAll(0x3f800000n, opts()).float?.value).toBe(1);
    expect(deriveAll(0o750n, opts({ bits: 16 })).perms).toBe('rwxr-x---');
    expect(deriveAll(0x10000n, opts()).perms).toBeUndefined();
    expect(deriveAll(1n, opts({ bits: 8 })).float).toBeUndefined();
  });
  it('carries fractions into every base and spots repeats', () => {
    const d = deriveAll(
      0n,
      opts({ fraction: { digits: '1', base: 10 }, fractionPrecision: 8 }),
    );
    expect(d.dec).toBe('0.1');
    expect(d.bin).toBe('0.00011001');
    expect(d.repeating?.bin).toBe(true);
    expect(d.repeating?.dec).toBe(false);
  });
  it('names control bytes', () => {
    expect([0, 32, 65, 127, 200].map(byteName)).toEqual([
      'NUL',
      'SP',
      'A',
      'DEL',
      '0xC8',
    ]);
  });
});
