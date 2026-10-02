import { describe, expect, it } from 'vitest';
import { convertFlavour, fromUnix, toUnix } from './flavour';
import { parseCron } from './parse';

describe('fromUnix', () => {
  it('keeps Unix and prefixes seconds', () => {
    expect(fromUnix('0 9 * * 1-5', 'unix')).toBe('0 9 * * 1-5');
    expect(fromUnix('0 9 * * 1-5', 'seconds')).toBe('0 0 9 * * 1-5');
  });
  it('gives Quartz a ? and its 1-based day numbers', () => {
    expect(fromUnix('0 9 * * 1-5', 'quartz')).toBe('0 0 9 ? * 2-6');
    expect(fromUnix('*/5 * * * *', 'quartz')).toBe('0 */5 * * * ?');
    expect(fromUnix('0 0 1 * *', 'quartz')).toBe('0 0 0 1 * ?');
    expect(fromUnix('0 0 * * 0,6', 'quartz')).toBe('0 0 0 ? * 1,7');
    expect(fromUnix('0 0 * * 7', 'quartz')).toBe('0 0 0 ? * 1');
  });
  it('keeps macros as they are', () => {
    expect(fromUnix('@daily', 'quartz')).toBe('@daily');
  });
  it('gives expressions that parse in the flavour', () => {
    for (const e of ['0 9 * * 1-5', '*/5 * * * *', '0 0 1 * *', '0 * * * *'])
      for (const f of ['unix', 'seconds', 'quartz'] as const)
        expect(() => parseCron(fromUnix(e, f), f)).not.toThrow();
  });
});

describe('toUnix', () => {
  it('reverses each flavour', () => {
    expect(toUnix('0 0 9 * * 1-5', 'seconds')).toBe('0 9 * * 1-5');
    expect(toUnix('0 0 9 ? * 2-6', 'quartz')).toBe('0 9 * * 1-5');
    expect(toUnix('0 0 9 ? * 2-6 2030', 'quartz')).toBe('0 9 * * 1-5');
  });
  it('gives null for Quartz specials or a wrong field count', () => {
    expect(toUnix('0 0 9 L * ?', 'quartz')).toBeNull();
    expect(toUnix('0 0 9 ? * 6#3', 'quartz')).toBeNull();
    expect(toUnix('1 2 3', 'unix')).toBeNull();
  });
});

describe('convertFlavour', () => {
  it('converts through the Unix form', () => {
    expect(convertFlavour('0 9 * * 1-5', 'unix', 'quartz')).toBe(
      '0 0 9 ? * 2-6',
    );
    expect(convertFlavour('0 0 9 ? * 2-6', 'quartz', 'seconds')).toBe(
      '0 0 9 * * 1-5',
    );
  });
  it('falls back to daily at midnight when it cannot convert', () => {
    expect(convertFlavour('0 0 9 L * ?', 'quartz', 'unix')).toBe('0 0 * * *');
  });
});
