/**
 * Byte-wise metadata fixtures for the EXIF tool: a TIFF/EXIF block with GPS,
 * a camera serial and an owner name, wrapped into JPEG (APP1), PNG (eXIf
 * plus tEXt) and WebP (VP8X plus EXIF and XMP chunks).
 */
import { encodeJpeg, encodePng, noiseImage } from './images';

const enc = new TextEncoder();

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

type Entry =
  | { tag: number; type: 'ascii'; value: string }
  | { tag: number; type: 'short'; value: number }
  | { tag: number; type: 'long'; value: number }
  | { tag: number; type: 'rational'; value: [number, number][] }
  | { tag: number; type: 'byte'; value: number[] };

const TYPE = { byte: 1, ascii: 2, short: 3, long: 4, rational: 5 } as const;

function payload(e: Entry): Uint8Array {
  switch (e.type) {
    case 'ascii':
      return enc.encode(`${e.value}\0`);
    case 'short': {
      const b = new Uint8Array(2);
      new DataView(b.buffer).setUint16(0, e.value);
      return b;
    }
    case 'long': {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setUint32(0, e.value);
      return b;
    }
    case 'rational': {
      const b = new Uint8Array(8 * e.value.length);
      const v = new DataView(b.buffer);
      e.value.forEach(([n, d], i) => {
        v.setUint32(i * 8, n);
        v.setUint32(i * 8 + 4, d);
      });
      return b;
    }
    case 'byte':
      return Uint8Array.from(e.value);
  }
}

const count = (e: Entry) =>
  e.type === 'ascii'
    ? e.value.length + 1
    : e.type === 'rational' || e.type === 'byte'
      ? e.value.length
      : 1;

/**
 * Writes big-endian IFDs laid out one after another. Pointer entries
 * (ExifIFD 0x8769, GPS 0x8825) are patched to the child IFD offsets.
 */
function tiff(ifds: Entry[][]): Uint8Array {
  const sizes = ifds.map((entries) => {
    const extra = entries.reduce((n, e) => {
      const p = payload(e).length;
      return n + (p > 4 ? p + (p % 2) : 0);
    }, 0);
    return 2 + entries.length * 12 + 4 + extra;
  });
  const offsets: number[] = [];
  let at = 8;
  for (const s of sizes) {
    offsets.push(at);
    at += s;
  }
  const out = new Uint8Array(at);
  const v = new DataView(out.buffer);
  out.set(enc.encode('MM'), 0);
  v.setUint16(2, 42);
  v.setUint32(4, 8);
  ifds.forEach((entries, i) => {
    const start = offsets[i];
    let data = start + 2 + entries.length * 12 + 4;
    v.setUint16(start, entries.length);
    entries.forEach((e, j) => {
      const o = start + 2 + j * 12;
      v.setUint16(o, e.tag);
      v.setUint16(o + 2, TYPE[e.type]);
      v.setUint32(o + 4, count(e));
      const p = payload(e);
      if (p.length <= 4) out.set(p, o + 8);
      else {
        v.setUint32(o + 8, data);
        out.set(p, data);
        data += p.length + (p.length % 2);
      }
    });
    v.setUint32(start + 2 + entries.length * 12, 0);
  });
  return out;
}

/** IFD0 (camera, owner), EXIF (serial, exposure, date) and GPS IFDs. */
export function exifTiff({
  orientation = 6,
  lat = 51.501476,
  lon = -0.140634,
} = {}): Uint8Array {
  const dms = (deg: number): [number, number][] => {
    const a = Math.abs(deg);
    const d = Math.floor(a);
    const m = Math.floor((a - d) * 60);
    const s = Math.round(((a - d) * 60 - m) * 60 * 10000);
    return [
      [d, 1],
      [m, 1],
      [s, 10000],
    ];
  };
  // IFD indexes: 0 = IFD0, 1 = EXIF, 2 = GPS. Pointer values are patched below.
  const ifd0: Entry[] = [
    { tag: 0x010f, type: 'ascii', value: 'Fixture Camera Co' },
    { tag: 0x0110, type: 'ascii', value: 'FX-100' },
    { tag: 0x0112, type: 'short', value: orientation },
    { tag: 0x0131, type: 'ascii', value: 'Fixture Editor 2.0' },
    { tag: 0x013b, type: 'ascii', value: 'Jane Fixture' },
    { tag: 0x8769, type: 'long', value: 0 },
    { tag: 0x8825, type: 'long', value: 0 },
  ];
  const exif: Entry[] = [
    { tag: 0x829a, type: 'rational', value: [[1, 250]] },
    { tag: 0x829d, type: 'rational', value: [[28, 10]] },
    { tag: 0x9003, type: 'ascii', value: '2024:05:06 07:08:09' },
    { tag: 0xa431, type: 'ascii', value: 'SN-0042-FIXTURE' },
  ];
  const gps: Entry[] = [
    { tag: 0x0000, type: 'byte', value: [2, 3, 0, 0] },
    { tag: 0x0001, type: 'ascii', value: lat >= 0 ? 'N' : 'S' },
    { tag: 0x0002, type: 'rational', value: dms(lat) },
    { tag: 0x0003, type: 'ascii', value: lon >= 0 ? 'E' : 'W' },
    { tag: 0x0004, type: 'rational', value: dms(lon) },
  ];
  // Two passes: lay out once to learn the offsets, then patch the pointers.
  const first = tiff([ifd0, exif, gps]);
  const v = new DataView(first.buffer);
  const n0 = v.getUint16(8);
  const exifAt = 8 + 2 + n0 * 12 + 4 + extraSize(ifd0);
  const gpsAt = exifAt + 2 + exif.length * 12 + 4 + extraSize(exif);
  ifd0[5] = { tag: 0x8769, type: 'long', value: exifAt };
  ifd0[6] = { tag: 0x8825, type: 'long', value: gpsAt };
  return tiff([ifd0, exif, gps]);
}

function extraSize(entries: Entry[]): number {
  return entries.reduce((n, e) => {
    const p = payload(e).length;
    return n + (p > 4 ? p + (p % 2) : 0);
  }, 0);
}

export const XMP_PACKET =
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
  '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">' +
  '<xmp:CreatorTool>Fixture Editor 2.0</xmp:CreatorTool></rdf:Description></rdf:RDF></x:xmpmeta>';

function jpegSegment(marker: number, body: Uint8Array): Uint8Array {
  return concat([
    Uint8Array.from([
      0xff,
      marker,
      (body.length + 2) >> 8,
      (body.length + 2) & 0xff,
    ]),
    body,
  ]);
}

/** A 32x24 noise JPEG with APP1 Exif, APP1 XMP, APP2 ICC stub, APP13 and COM. */
export function jpegWithMetadata(
  opts?: Parameters<typeof exifTiff>[0],
): Uint8Array {
  const base = encodeJpeg(32, 24, noiseImage(32, 24, 4, 3), 90);
  const app1 = jpegSegment(
    0xe1,
    concat([enc.encode('Exif\0\0'), exifTiff(opts)]),
  );
  const xmp = jpegSegment(
    0xe1,
    concat([
      enc.encode('http://ns.adobe.com/xap/1.0/\0'),
      enc.encode(XMP_PACKET),
    ]),
  );
  const iptc = jpegSegment(0xed, enc.encode('Photoshop 3.0\0fixture'));
  const com = jpegSegment(0xfe, enc.encode('fixture comment'));
  return concat([base.subarray(0, 2), app1, xmp, iptc, com, base.subarray(2)]);
}

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

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(enc.encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** An 8x8 PNG with eXIf, tEXt (Author), iTXt, tIME chunks before IDAT. */
export function pngWithMetadata(): Uint8Array {
  const rgba = noiseImage(8, 8, 4, 5);
  const png = encodePng(8, 8, rgba);
  const ihdrEnd = 8 + 25;
  const extra = concat([
    pngChunk('eXIf', exifTiff()),
    pngChunk('tEXt', enc.encode('Author\0Jane Fixture')),
    pngChunk('iTXt', enc.encode('Comment\0\0\0\0\0fixture comment')),
    pngChunk('tIME', Uint8Array.from([0x07, 0xe8, 5, 6, 7, 8, 9])),
  ]);
  return concat([png.subarray(0, ihdrEnd), extra, png.subarray(ihdrEnd)]);
}

/** The 1x1 lossless WebP used for feature detection (Modernizr). */
const VP8L_1X1 = Uint8Array.from(
  atob('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='),
  (c) => c.charCodeAt(0),
);

function riffChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const pad = data.length % 2;
  const out = new Uint8Array(8 + data.length + pad);
  out.set(enc.encode(fourcc), 0);
  new DataView(out.buffer).setUint32(4, data.length, true);
  out.set(data, 8);
  return out;
}

/** An extended (VP8X) 1x1 WebP with EXIF and XMP chunks. */
export function webpWithMetadata(): Uint8Array {
  const vp8l = VP8L_1X1.subarray(12); // the VP8L chunk, header included
  const vp8x = new Uint8Array(10);
  vp8x[0] = 0x08 | 0x04 | 0x10; // EXIF, XMP and alpha flags
  // canvas width-1 and height-1 as 24-bit little endian: both 0 for 1x1
  const body = concat([
    riffChunk('VP8X', vp8x),
    vp8l,
    riffChunk('EXIF', exifTiff()),
    riffChunk('XMP ', enc.encode(XMP_PACKET)),
  ]);
  const header = new Uint8Array(12);
  header.set(enc.encode('RIFF'), 0);
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  header.set(enc.encode('WEBP'), 8);
  return concat([header, body]);
}
