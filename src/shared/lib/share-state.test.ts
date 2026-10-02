import { deflateSync, Inflate } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { bytesToBase64, utf8Encode } from './encoding';
import { decodeShare, encodeShare } from './share-state';

describe('share codec', () => {
  it('round-trips state with a version', () => {
    const r = encodeShare({ pattern: '\\d+', flags: 'g' }, 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fragment).toMatch(/^s=1\.[A-Za-z0-9_-]+$/);
    expect(decodeShare(r.fragment)).toEqual({
      version: 2,
      state: { pattern: '\\d+', flags: 'g' },
    });
  });
  it('accepts the fragment with its leading hash', () => {
    const r = encodeShare({ a: 1 }, 1);
    if (!r.ok) throw new Error('expected ok');
    expect(decodeShare(`#${r.fragment}`).state).toEqual({ a: 1 });
  });
  it('refuses state whose fragment would exceed 6000 characters', () => {
    // An LCG, not (i * k) % 97: a periodic sequence compresses too well.
    let x = 1;
    const noisy = Array.from({ length: 20_000 }, () => {
      x = (x * 1_103_515_245 + 12_345) % 2_147_483_648;
      return x % 97;
    }).join(',');
    expect(encodeShare({ noisy }, 1)).toMatchObject({
      ok: false,
      reason: 'too-large',
    });
  });
  it('refuses JSON over 64 KB before compressing', () => {
    expect(encodeShare({ s: 'a'.repeat(70_000) }, 1)).toMatchObject({
      ok: false,
      reason: 'too-large',
    });
  });
  it('rejects damaged, oversized and zip-bomb fragments', () => {
    expect(() => decodeShare('s=1.!!!')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() => decodeShare(`s=1.${'A'.repeat(16_001)}`)).toThrow(/damaged/);
    const bomb = bytesToBase64(
      deflateSync(
        utf8Encode(JSON.stringify({ v: 1, s: 'a'.repeat(1_000_000) })),
      ),
      { urlSafe: true, padding: false },
    );
    expect(() => decodeShare(`s=1.${bomb}`)).toThrow(/damaged/);
  });
  it('rejects a payload without the version envelope', () => {
    const raw = bytesToBase64(deflateSync(utf8Encode('{"x":1}')), {
      urlSafe: true,
      padding: false,
    });
    expect(() => decodeShare(`s=1.${raw}`)).toThrow(/damaged/);
    expect(() => decodeShare('nothing')).toThrow(/damaged/);
  });
  it('enforces the zip-bomb cap while inflating, not after', () => {
    // A maximal-ratio bomb that fits under the fragment limit.
    const bomb = bytesToBase64(
      deflateSync(utf8Encode('a'.repeat(11_000_000)), { level: 9 }),
      { urlSafe: true, padding: false },
    );
    expect(bomb.length).toBeLessThan(16_000);
    // Count what the decoder inflates before it gives up.
    const real = Inflate.prototype.push;
    let produced = 0;
    let pushes = 0;
    const spy = vi
      .spyOn(Inflate.prototype, 'push')
      .mockImplementation(function (this: Inflate, chunk, final) {
        pushes++;
        const ondata = this.ondata;
        this.ondata = (data, last) => {
          produced += data.length;
          ondata.call(this, data, last);
        };
        try {
          real.call(this, chunk, final);
        } finally {
          this.ondata = ondata;
        }
      });
    expect(() => decodeShare(`s=1.${bomb}`)).toThrow(/damaged/);
    spy.mockRestore();
    expect(pushes).toBeGreaterThan(1);
    // At most one small input chunk's output past the 256 KB cap.
    expect(produced).toBeLessThan(262_144 + 140_000);
  });
  it('rejects unknown codec versions', () => {
    expect(() => decodeShare('s=9.abc')).toThrow(/newer version/);
  });
});

describe('share codec defence in depth (6-A1 M2)', () => {
  it('drops __proto__, constructor and prototype keys while decoding', () => {
    const json =
      '{"v":1,"s":{"a":1,"__proto__":{"x":1},"n":{"constructor":2,"prototype":3,"b":4}}}';
    const raw = bytesToBase64(deflateSync(utf8Encode(json)), {
      urlSafe: true,
      padding: false,
    });
    const { state } = decodeShare(`s=1.${raw}`);
    expect(state).toEqual({ a: 1, n: { b: 4 } });
    expect(Object.hasOwn(state as object, '__proto__')).toBe(false);
  });
});
