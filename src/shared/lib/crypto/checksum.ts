/**
 * Non-cryptographic checksums missing from @noble/hashes (ruling R29):
 * CRC-32 (IEEE), CRC-32C (Castagnoli), XXH64 and XXH3-64, all incremental.
 * XXH values follow the reference xxhash.h (seed 0, default secret).
 */

export interface Checksum {
  update(bytes: Uint8Array): void;
  /** Big-endian hex, as the reference tools print it. */
  digestHex(): string;
}

const hex64 = (v: bigint) => v.toString(16).padStart(16, '0');

function crcTable(poly: number): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? poly ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}

const CRC32 = crcTable(0xedb88320);
const CRC32C = crcTable(0x82f63b78);

function createCrc(table: Uint32Array): Checksum {
  let crc = 0xffffffff;
  return {
    update(bytes) {
      for (let i = 0; i < bytes.length; i++)
        crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    },
    digestHex: () => ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0'),
  };
}

export const createCrc32 = () => createCrc(CRC32);
export const createCrc32c = () => createCrc(CRC32C);

// 64-bit arithmetic on BigInt, wrapped to unsigned 64 bits.
const M64 = (1n << 64n) - 1n;
const M32 = 0xffffffffn;
const P64_1 = 0x9e3779b185ebca87n;
const P64_2 = 0xc2b2ae3d27d4eb4fn;
const P64_3 = 0x165667b19e3779f9n;
const P64_4 = 0x85ebca77c2b2ae63n;
const P64_5 = 0x27d4eb2f165667c5n;
const P32_1 = 0x9e3779b1n;
const P32_2 = 0x85ebca77n;
const P32_3 = 0xc2b2ae3dn;

const mul = (a: bigint, b: bigint) => (a * b) & M64;
const add = (a: bigint, b: bigint) => (a + b) & M64;
const rotl = (v: bigint, r: bigint) => ((v << r) | (v >> (64n - r))) & M64;

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
const r64 = (d: DataView, o: number) => d.getBigUint64(o, true);
const r32 = (d: DataView, o: number) => BigInt(d.getUint32(o, true));

// The hot loops (XXH64 rounds, XXH3 accumulate and scramble) run on 64-bit
// lanes held as [lo, hi] uint32 pairs, about ten times faster than BigInt;
// the short paths and finalisation stay on BigInt.

/** Result of the last mul64 / mul32 (no allocation in the hot loops). */
let mLo = 0;
let mHi = 0;

/** Low 64 bits of (aHi:aLo) * (bHi:bLo), into mLo and mHi. */
function mul64(aLo: number, aHi: number, bLo: number, bHi: number): void {
  mul32(aLo, bLo);
  mHi = (mHi + Math.imul(aLo, bHi) + Math.imul(aHi, bLo)) >>> 0;
}

/** The full 64-bit product of two uint32s, into mLo and mHi. */
function mul32(a: number, b: number): void {
  const a0 = a & 0xffff;
  const a1 = a >>> 16;
  const b0 = b & 0xffff;
  const b1 = b >>> 16;
  const p00 = a0 * b0;
  const p01 = a0 * b1;
  const p10 = a1 * b0;
  const mid = (p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff);
  mLo = ((mid << 16) | (p00 & 0xffff)) >>> 0;
  mHi = (a1 * b1 + (p01 >>> 16) + (p10 >>> 16) + (mid >>> 16)) >>> 0;
}

/** lanes[i] += (lo, hi), wrapping at 64 bits. */
function addLane(lanes: Uint32Array, i: number, lo: number, hi: number): void {
  const l = (lanes[2 * i] + lo) >>> 0;
  lanes[2 * i + 1] = (lanes[2 * i + 1] + hi + (l < lo ? 1 : 0)) >>> 0;
  lanes[2 * i] = l;
}

const laneOf = (lanes: Uint32Array, i: number) =>
  (BigInt(lanes[2 * i + 1]) << 32n) | BigInt(lanes[2 * i]);

function lanesOf(values: readonly bigint[]): Uint32Array {
  const out = new Uint32Array(values.length * 2);
  values.forEach((v, i) => {
    out[2 * i] = Number(v & M32);
    out[2 * i + 1] = Number(v >> 32n);
  });
  return out;
}

const loOf = (v: bigint) => Number(v & M32);
const hiOf = (v: bigint) => Number(v >> 32n);

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) return b;
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

// XXH64

const round64 = (acc: bigint, input: bigint) =>
  mul(rotl(add(acc, mul(input, P64_2)), 31n), P64_1);
const merge64 = (acc: bigint, val: bigint) =>
  add(mul(acc ^ round64(0n, val), P64_1), P64_4);

function avalanche64(h: bigint): bigint {
  h = mul(h ^ (h >> 33n), P64_2);
  h = mul(h ^ (h >> 29n), P64_3);
  return h ^ (h >> 32n);
}

const P1_LO = loOf(P64_1);
const P1_HI = hiOf(P64_1);
const P2_LO = loOf(P64_2);
const P2_HI = hiOf(P64_2);

/** round64 on lane `i`: rotl(acc + input * P2, 31) * P1. */
function roundLane(v: Uint32Array, i: number, inLo: number, inHi: number) {
  mul64(inLo, inHi, P2_LO, P2_HI);
  addLane(v, i, mLo, mHi);
  const lo = v[2 * i];
  const hi = v[2 * i + 1];
  mul64(
    ((lo << 31) | (hi >>> 1)) >>> 0,
    ((hi << 31) | (lo >>> 1)) >>> 0,
    P1_LO,
    P1_HI,
  );
  v[2 * i] = mLo;
  v[2 * i + 1] = mHi;
}

export function createXxh64(): Checksum {
  const lanes = lanesOf([add(P64_1, P64_2), P64_2, 0n, (0n - P64_1) & M64]);
  let pending: Uint8Array = new Uint8Array(0);
  let total = 0;
  return {
    update(bytes) {
      total += bytes.length;
      const data = concat(pending, bytes);
      const d = view(data);
      let o = 0;
      for (; o + 32 <= data.length; o += 32)
        for (let i = 0; i < 4; i++)
          roundLane(
            lanes,
            i,
            d.getUint32(o + i * 8, true),
            d.getUint32(o + i * 8 + 4, true),
          );
      pending = data.slice(o);
    },
    digestHex() {
      const v = [0, 1, 2, 3].map((i) => laneOf(lanes, i));
      let h: bigint;
      if (total >= 32) {
        h = add(
          add(rotl(v[0], 1n), rotl(v[1], 7n)),
          add(rotl(v[2], 12n), rotl(v[3], 18n)),
        );
        for (const x of v) h = merge64(h, x);
      } else h = P64_5;
      h = add(h, BigInt(total));
      const d = view(pending);
      let o = 0;
      for (; o + 8 <= pending.length; o += 8) {
        h ^= round64(0n, r64(d, o));
        h = add(mul(rotl(h, 27n), P64_1), P64_4);
      }
      if (o + 4 <= pending.length) {
        h ^= mul(r32(d, o), P64_1);
        h = add(mul(rotl(h, 23n), P64_2), P64_3);
        o += 4;
      }
      for (; o < pending.length; o++) {
        h ^= mul(BigInt(pending[o]), P64_5);
        h = mul(rotl(h, 11n), P64_1);
      }
      return hex64(avalanche64(h));
    },
  };
}

// XXH3-64

// prettier-ignore
const SECRET = Uint8Array.of(
  0xb8, 0xfe, 0x6c, 0x39, 0x23, 0xa4, 0x4b, 0xbe, 0x7c, 0x01, 0x81, 0x2c, 0xf7, 0x21, 0xad, 0x1c,
  0xde, 0xd4, 0x6d, 0xe9, 0x83, 0x90, 0x97, 0xdb, 0x72, 0x40, 0xa4, 0xa4, 0xb7, 0xb3, 0x67, 0x1f,
  0xcb, 0x79, 0xe6, 0x4e, 0xcc, 0xc0, 0xe5, 0x78, 0x82, 0x5a, 0xd0, 0x7d, 0xcc, 0xff, 0x72, 0x21,
  0xb8, 0x08, 0x46, 0x74, 0xf7, 0x43, 0x24, 0x8e, 0xe0, 0x35, 0x90, 0xe6, 0x81, 0x3a, 0x26, 0x4c,
  0x3c, 0x28, 0x52, 0xbb, 0x91, 0xc3, 0x00, 0xcb, 0x88, 0xd0, 0x65, 0x8b, 0x1b, 0x53, 0x2e, 0xa3,
  0x71, 0x64, 0x48, 0x97, 0xa2, 0x0d, 0xf9, 0x4e, 0x38, 0x19, 0xef, 0x46, 0xa9, 0xde, 0xac, 0xd8,
  0xa8, 0xfa, 0x76, 0x3f, 0xe3, 0x9c, 0x34, 0x3f, 0xf9, 0xdc, 0xbb, 0xc7, 0xc7, 0x0b, 0x4f, 0x1d,
  0x8a, 0x51, 0xe0, 0x4b, 0xcd, 0xb4, 0x59, 0x31, 0xc8, 0x9f, 0x7e, 0xc9, 0xd9, 0x78, 0x73, 0x64,
  0xea, 0xc5, 0xac, 0x83, 0x34, 0xd3, 0xeb, 0xc3, 0xc5, 0x81, 0xa0, 0xff, 0xfa, 0x13, 0x63, 0xeb,
  0x17, 0x0d, 0xdd, 0x51, 0xb7, 0xf0, 0xda, 0x49, 0xd3, 0x16, 0x55, 0x26, 0x29, 0xd4, 0x68, 0x9e,
  0x2b, 0x16, 0xbe, 0x58, 0x7d, 0x47, 0xa1, 0xfc, 0x8f, 0xf8, 0xb8, 0xd1, 0x7a, 0xd0, 0x31, 0xce,
  0x45, 0xcb, 0x3a, 0x8f, 0x95, 0x16, 0x04, 0x28, 0xaf, 0xd7, 0xfb, 0xca, 0xbb, 0x4b, 0x40, 0x7e,
);
const S = view(SECRET);
const s64 = (o: number) => r64(S, o);
const s32 = (o: number) => r32(S, o);

const PRIME_MX1 = 0x165667919e3779f9n;
const PRIME_MX2 = 0x9fb21c651e98df25n;
const STRIPE = 64;
const STRIPES_PER_BLOCK = (SECRET.length - STRIPE) / 8;
const MIDSIZE_MAX = 240;

function fold128(a: bigint, b: bigint): bigint {
  const p = a * b;
  return (p & M64) ^ (p >> 64n);
}

function avalanche3(h: bigint): bigint {
  h = mul(h ^ (h >> 37n), PRIME_MX1);
  return h ^ (h >> 32n);
}

function rrmxmx(h: bigint, len: number): bigint {
  h ^= rotl(h, 49n) ^ rotl(h, 24n);
  h = mul(h, PRIME_MX2);
  h ^= add(h >> 35n, BigInt(len));
  h = mul(h, PRIME_MX2);
  return h ^ (h >> 28n);
}

const swap64 = (v: bigint) => {
  let out = 0n;
  for (let i = 0n; i < 64n; i += 8n) out = (out << 8n) | ((v >> i) & 0xffn);
  return out;
};

const mix16 = (d: DataView, o: number, so: number) =>
  fold128(r64(d, o) ^ s64(so), r64(d, o + 8) ^ s64(so + 8));

function xxh3Short(input: Uint8Array): bigint {
  const len = input.length;
  const d = view(input);
  if (len === 0) return avalanche64(s64(56) ^ s64(64));
  if (len <= 3) {
    const combined =
      (BigInt(input[0]) << 16n) |
      (BigInt(input[len >> 1]) << 24n) |
      BigInt(input[len - 1]) |
      (BigInt(len) << 8n);
    return avalanche64(combined ^ ((s32(0) ^ s32(4)) & M32));
  }
  if (len <= 8) {
    const in64 = add(r32(d, len - 4), r32(d, 0) << 32n);
    return rrmxmx(in64 ^ (s64(8) ^ s64(16)), len);
  }
  if (len <= 16) {
    const lo = r64(d, 0) ^ (s64(24) ^ s64(32));
    const hi = r64(d, len - 8) ^ (s64(40) ^ s64(48));
    const acc = add(add(add(BigInt(len), swap64(lo)), hi), fold128(lo, hi));
    return avalanche3(acc);
  }
  let acc = mul(BigInt(len), P64_1);
  if (len <= 128) {
    if (len > 32) {
      if (len > 64) {
        if (len > 96) {
          acc = add(acc, mix16(d, 48, 96));
          acc = add(acc, mix16(d, len - 64, 112));
        }
        acc = add(acc, mix16(d, 32, 64));
        acc = add(acc, mix16(d, len - 48, 80));
      }
      acc = add(acc, mix16(d, 16, 32));
      acc = add(acc, mix16(d, len - 32, 48));
    }
    acc = add(acc, mix16(d, 0, 0));
    acc = add(acc, mix16(d, len - 16, 16));
    return avalanche3(acc);
  }
  // 129 to 240 bytes.
  for (let i = 0; i < 8; i++) acc = add(acc, mix16(d, 16 * i, 16 * i));
  acc = avalanche3(acc);
  const rounds = Math.floor(len / 16);
  for (let i = 8; i < rounds; i++)
    acc = add(acc, mix16(d, 16 * i, 16 * (i - 8) + 3));
  acc = add(acc, mix16(d, len - 16, 136 - 17));
  return avalanche3(acc);
}

function accumulate512(acc: Uint32Array, d: DataView, o: number, so: number) {
  for (let i = 0; i < 8; i++) {
    const vLo = d.getUint32(o + 8 * i, true);
    const vHi = d.getUint32(o + 8 * i + 4, true);
    addLane(acc, i ^ 1, vLo, vHi);
    mul32(
      (vLo ^ S.getUint32(so + 8 * i, true)) >>> 0,
      (vHi ^ S.getUint32(so + 8 * i + 4, true)) >>> 0,
    );
    addLane(acc, i, mLo, mHi);
  }
}

const P32_1_NUM = Number(P32_1);

function scramble(acc: Uint32Array) {
  const so = SECRET.length - STRIPE;
  for (let i = 0; i < 8; i++) {
    const hi = acc[2 * i + 1];
    // a ^= a >> 47; a ^= secret; a *= P32_1.
    const lo = (acc[2 * i] ^ (hi >>> 15) ^ S.getUint32(so + 8 * i, true)) >>> 0;
    mul64(lo, (hi ^ S.getUint32(so + 8 * i + 4, true)) >>> 0, P32_1_NUM, 0);
    acc[2 * i] = mLo;
    acc[2 * i + 1] = mHi;
  }
}

/**
 * Streams the long path: a stripe is folded in only once a later byte is
 * known to exist, because the reference treats the final stripe separately.
 */
export function createXxh3(): Checksum {
  const acc = lanesOf([P32_3, P64_1, P64_2, P64_3, P64_4, P32_2, P64_5, P32_1]);
  let head: Uint8Array = new Uint8Array(0); // first MIDSIZE_MAX + 1 bytes
  let pending: Uint8Array = new Uint8Array(0);
  let last: Uint8Array = new Uint8Array(0); // last STRIPE bytes seen
  let stripe = 0;
  let total = 0;
  return {
    update(bytes) {
      if (bytes.length === 0) return;
      total += bytes.length;
      if (head.length <= MIDSIZE_MAX)
        head = concat(head, bytes.subarray(0, MIDSIZE_MAX + 1 - head.length));
      last = concat(last, bytes).slice(-STRIPE);
      const data = concat(pending, bytes);
      const d = view(data);
      let o = 0;
      for (; data.length - o > STRIPE; o += STRIPE) {
        accumulate512(acc, d, o, stripe * 8);
        if (++stripe === STRIPES_PER_BLOCK) {
          scramble(acc);
          stripe = 0;
        }
      }
      pending = data.slice(o);
    },
    digestHex() {
      if (total <= MIDSIZE_MAX) return hex64(xxh3Short(head));
      const lanes = acc.slice();
      accumulate512(lanes, view(last), 0, SECRET.length - STRIPE - 7);
      const a = Array.from({ length: 8 }, (_, i) => laneOf(lanes, i));
      let h = mul(BigInt(total), P64_1);
      for (let i = 0; i < 4; i++)
        h = add(
          h,
          fold128(a[2 * i] ^ s64(11 + 16 * i), a[2 * i + 1] ^ s64(19 + 16 * i)),
        );
      return hex64(avalanche3(h));
    },
  };
}
