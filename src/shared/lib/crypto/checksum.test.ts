import { describe, expect, it } from 'vitest';
import { utf8Encode } from '../encoding';
import {
  createCrc32,
  createCrc32c,
  createXxh3,
  createXxh64,
  type Checksum,
} from './checksum';

/** The byte stream the reference vectors were generated from (C LCG). */
function lcgBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  let x = 1;
  for (let i = 0; i < n; i++) {
    x = (Math.imul(x, 1_103_515_245) + 12_345) >>> 0;
    out[i] = (x >>> 16) & 0xff;
  }
  return out;
}

// [length, XXH64, XXH3-64] from the reference xxhash.h (seed 0).
const XXH: [number, string, string][] = [
  [0, 'ef46db3751d8e999', '2d06800538d394c2'],
  [1, 'd2da77930f69647c', 'e5e62017e96f839c'],
  [2, '9f33d4bd50f99c34', 'e99f8ba75698ec0f'],
  [3, 'f7c331cf2042b940', 'd3bcc83c6f14e70f'],
  [4, '1b042f821fc4a793', 'c7f159f34b126cb4'],
  [5, '6e1f98107d9db571', '0276f65070331568'],
  [8, 'ef7823fce4ad9afb', '0f25a2a1cc43dda2'],
  [9, '81cf88e9d8340150', '1e3be9699baa50cf'],
  [15, '6f0095b1c00e82fb', 'bb9c1f12fc955b0c'],
  [16, '29965039df6047bb', '9ec324145cea1dcb'],
  [17, '5236fcb96d8fb228', '48f3651d7436310a'],
  [32, 'ad7dc5a569bb047c', '3ecd923442085a0d'],
  [33, '475b642ac692e380', '0afebb54eff3a3b5'],
  [64, '06872c5d6370de25', '7abe508541644d25'],
  [65, '8b5f4e34a32c5a09', 'da2a9fa52b7fadf5'],
  [96, 'df54d08173bdf185', '014dbb30ecd7c670'],
  [97, '965c7075e19fc07f', '7b0a9dae42e89ff6'],
  [128, '2e9c4cb0b29bc8ec', '5d813d42c0005ea8'],
  [129, 'b5e3a45bff735cfa', 'c61639b552225575'],
  [200, '3360956b748fef55', 'aea1c4e1114bf7db'],
  [240, 'a14b661f3c30185f', '7d85b8d4f8b10c82'],
  [241, 'da1129fbf2b0b246', '5c56141c894cd97e'],
  [255, '9ad1f660b88abc38', 'a88268bb584966d3'],
  [256, '9ae30993c3f4b05a', 'cdb34974678d6687'],
  [1023, 'e62022a7b1965532', '123989704c814592'],
  [1024, '448bfe8eb25c8c2c', '0551dea22e104ea8'],
  [1025, 'd2f855a37c530e55', 'dbe2ed3c377d9922'],
  [1088, '75f06b3b292371f4', '98ce47a58d705d59'],
  [2048, 'b64b9dad43b09e3e', '0e137a69a82b62c0'],
  [2049, '49982fb16c4ba9f0', '2ba993b30fe87e40'],
  [4999, '020c74642c5fcb9b', '5d0dc4cd666a283c'],
];

const run = (c: Checksum, chunks: Uint8Array[]) => {
  for (const ch of chunks) c.update(ch);
  return c.digestHex();
};

/** Splits bytes into uneven chunks (1, 7, 63, 64, 65, ... bytes). */
function chunked(bytes: Uint8Array): Uint8Array[] {
  const sizes = [1, 7, 63, 64, 65, 200, 1000];
  const out: Uint8Array[] = [];
  for (let o = 0, i = 0; o < bytes.length; i++) {
    const n = sizes[i % sizes.length];
    out.push(bytes.subarray(o, o + n));
    o += n;
  }
  return out;
}

describe('checksums', () => {
  it('CRC-32 and CRC-32C check values', () => {
    const nine = utf8Encode('123456789');
    expect(run(createCrc32(), [nine])).toBe('cbf43926');
    expect(run(createCrc32c(), [nine])).toBe('e3069283');
    expect(
      run(createCrc32(), [
        utf8Encode('The quick brown fox jumps over the lazy dog'),
      ]),
    ).toBe('414fa339');
    expect(run(createCrc32(), [])).toBe('00000000');
  });
  it.each(XXH)('XXH64 and XXH3 of %i bytes', (n, x64, x3) => {
    const bytes = lcgBytes(n);
    expect(run(createXxh64(), [bytes])).toBe(x64);
    expect(run(createXxh3(), [bytes])).toBe(x3);
    expect(run(createXxh64(), chunked(bytes))).toBe(x64);
    expect(run(createXxh3(), chunked(bytes))).toBe(x3);
  });
  it('XXH of a sentence', () => {
    const fox = utf8Encode('The quick brown fox jumps over the lazy dog');
    expect(run(createXxh64(), [fox])).toBe('0b242d361fda71bc');
    expect(run(createXxh3(), [fox])).toBe('ce7d19a5418fb365');
  });
});
