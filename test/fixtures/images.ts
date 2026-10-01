import jpeg from 'jpeg-js';
import { zlibSync } from 'fflate';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Minimal valid PNG: 8-bit RGBA, filter 0 on every row, one IDAT. */
export function encodePng(
  width: number,
  height: number,
  rgba: Uint8Array,
): Uint8Array {
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return concat([
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlibSync(raw)),
    pngChunk('IEND', new Uint8Array()),
  ]);
}

export function pngDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}

/**
 * Valid GIF89a with up to 4 colours. Emitting an LZW CLEAR code before every
 * pixel keeps the code width fixed at 3 bits, so no dictionary is needed.
 */
export function encodeGif(
  width: number,
  height: number,
  indices: Uint8Array,
  palette: [number, number, number][],
): Uint8Array {
  if (palette.length > 4) throw new Error('encodeGif supports up to 4 colours');
  const out: number[] = [];
  const u16 = (n: number) => out.push(n & 0xff, (n >> 8) & 0xff);
  for (const ch of 'GIF89a') out.push(ch.charCodeAt(0));
  u16(width);
  u16(height);
  out.push(0b1000_0001, 0, 0); // global colour table of 2^(1+1) = 4 entries
  for (let i = 0; i < 4; i++) out.push(...(palette[i] ?? [0, 0, 0]));
  out.push(0x2c);
  u16(0);
  u16(0);
  u16(width);
  u16(height);
  out.push(0); // image descriptor: no local table, not interlaced
  out.push(2); // LZW minimum code size
  const codes: number[] = [];
  for (const px of indices) codes.push(4, px); // CLEAR, pixel
  codes.push(5); // END
  const data: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const code of codes) {
    acc |= code << bits;
    bits += 3;
    while (bits >= 8) {
      data.push(acc & 0xff);
      acc >>= 8;
      bits -= 8;
    }
  }
  if (bits > 0) data.push(acc & 0xff);
  for (let i = 0; i < data.length; i += 255) {
    const block = data.slice(i, i + 255);
    out.push(block.length, ...block);
  }
  out.push(0, 0x3b);
  return Uint8Array.from(out);
}

export function encodeJpeg(
  width: number,
  height: number,
  rgba: Uint8Array,
  quality = 90,
): Uint8Array {
  return new Uint8Array(
    jpeg.encode({ data: rgba, width, height }, quality).data,
  );
}

/** Deterministic "photo-like" pixels: a gradient plus noise (JPEG wins, Flate doesn't). */
export function noiseImage(
  width: number,
  height: number,
  channels: 1 | 3 | 4,
  seed = 1,
): Uint8Array {
  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const out = new Uint8Array(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      for (let c = 0; c < channels; c++) {
        if (channels === 4 && c === 3) {
          out[o + c] = 255;
          continue;
        }
        const base = ((x / width) * 160 + (y / height) * 60 + c * 30) % 256;
        out[o + c] = Math.max(
          0,
          Math.min(255, Math.round(base + (rand() - 0.5) * 48)),
        );
      }
    }
  }
  return out;
}

/** 8-bit alpha: opaque centre fading to transparent edges. */
export function radialAlpha(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      out[y * width + x] = Math.round(255 * Math.max(0, Math.min(1, 1.2 - d)));
    }
  }
  return out;
}
