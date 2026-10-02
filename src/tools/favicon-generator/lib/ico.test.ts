import { describe, expect, it } from 'vitest';
import { encodePng } from '../../../../test/fixtures/images';
import { readIcoDirectory, writeIco } from './ico';

const png = (n: number) => encodePng(n, n, new Uint8Array(n * n * 4).fill(200));

describe('writeIco', () => {
  it('writes the header, three entries and PNG payloads', () => {
    const ico = writeIco([
      { size: 16, bytes: png(16) },
      { size: 32, bytes: png(32) },
      { size: 48, bytes: png(48) },
    ]);
    const v = new DataView(ico.buffer);
    expect(v.getUint16(0, true)).toBe(0);
    expect(v.getUint16(2, true)).toBe(1);
    expect(v.getUint16(4, true)).toBe(3);
    const dir = readIcoDirectory(ico);
    expect(dir.map((d) => d.width)).toEqual([16, 32, 48]);
    for (const d of dir) {
      expect([...ico.subarray(d.offset, d.offset + 4)]).toEqual([
        0x89, 0x50, 0x4e, 0x47,
      ]);
      expect(d.offset + d.size).toBeLessThanOrEqual(ico.length);
    }
    expect(dir[2].offset + dir[2].size).toBe(ico.length);
  });

  it('writes 256 as 0 and refuses non-PNG payloads', () => {
    expect(
      readIcoDirectory(writeIco([{ size: 256, bytes: png(1) }]))[0].width,
    ).toBe(256);
    expect(() => writeIco([{ size: 16, bytes: new Uint8Array(8) }])).toThrow(
      /PNG/,
    );
    expect(() => writeIco([])).toThrow();
  });
});
