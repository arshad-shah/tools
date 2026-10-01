import { describe, expect, it } from 'vitest';
import { ownBuffer } from './bytes';

describe('ownBuffer', () => {
  it('returns whole-buffer views as-is and copies partial views', () => {
    const whole = new Uint8Array([1, 2, 3]);
    expect(ownBuffer(whole)).toBe(whole);
    const part = new Uint8Array(new ArrayBuffer(8), 2, 3);
    const copy = ownBuffer(part);
    expect(copy).not.toBe(part);
    expect(copy.buffer.byteLength).toBe(3);
  });
});
