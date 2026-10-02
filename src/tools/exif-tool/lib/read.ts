import { ToolError } from '@/shared/lib/errors';
import {
  normalizeIsoBoxes,
  riffChunks,
  sniffImage,
  type ImageFormat,
} from './format';

export const GROUPS = [
  'camera',
  'exposure',
  'image',
  'dates',
  'gps',
  'software',
  'iptc',
  'xmp',
  'icc',
  'other',
] as const;
export type MetaGroup = (typeof GROUPS)[number];

export interface Metadata {
  format: ImageFormat;
  groups: Record<MetaGroup, [string, string][]>;
  thumbnail?: Uint8Array;
  gps?: { lat: number; lon: number };
}

const KEYS: Partial<Record<MetaGroup, readonly string[]>> = {
  camera: [
    'Make',
    'Model',
    'LensMake',
    'LensModel',
    'LensInfo',
    'SerialNumber',
    'BodySerialNumber',
    'LensSerialNumber',
    'CameraSerialNumber',
    'InternalSerialNumber',
    'OwnerName',
    'CameraOwnerName',
    'Artist',
    'Author',
    'Copyright',
  ],
  exposure: [
    'ExposureTime',
    'FNumber',
    'ISO',
    'ExposureProgram',
    'ExposureCompensation',
    'ExposureBiasValue',
    'ExposureMode',
    'MeteringMode',
    'Flash',
    'FocalLength',
    'FocalLengthIn35mmFormat',
    'WhiteBalance',
    'ShutterSpeedValue',
    'ApertureValue',
    'BrightnessValue',
    'MaxApertureValue',
    'SceneCaptureType',
  ],
  image: [
    'ImageWidth',
    'ImageHeight',
    'ExifImageWidth',
    'ExifImageHeight',
    'Orientation',
    'XResolution',
    'YResolution',
    'ResolutionUnit',
    'ColorSpace',
    'BitDepth',
    'ColorType',
    'Compression',
    'Interlace',
    'Filter',
    'BitsPerSample',
    'YCbCrPositioning',
  ],
  dates: [
    'DateTimeOriginal',
    'CreateDate',
    'ModifyDate',
    'DateTimeDigitized',
    'DateTime',
    'OffsetTime',
    'OffsetTimeOriginal',
    'OffsetTimeDigitized',
    'SubSecTime',
    'SubSecTimeOriginal',
    'SubSecTimeDigitized',
  ],
  software: ['Software', 'ProcessingSoftware', 'HostComputer', 'CreatorTool'],
};

const GROUP_OF = new Map<string, MetaGroup>(
  Object.entries(KEYS).flatMap(([g, keys]) =>
    keys.map((k) => [k, g as MetaGroup] as const),
  ),
);

/** Segments whose keys all belong to one group whatever their names. */
const SEGMENT_GROUP: Record<string, MetaGroup | undefined> = {
  gps: 'gps',
  iptc: 'iptc',
  xmp: 'xmp',
  icc: 'icc',
};

/** A metadata value as display text. */
export function displayValue(v: unknown): string {
  if (v instanceof Date)
    return Number.isNaN(v.getTime()) ? 'Invalid date' : v.toISOString();
  if (v instanceof Uint8Array || v instanceof ArrayBuffer)
    return `Binary data (${v.byteLength} bytes)`;
  if (Array.isArray(v)) return v.map(displayValue).join(', ');
  if (typeof v === 'number') return String(Number(v.toPrecision(10)));
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const enc = new TextEncoder();

function segment(marker: number, header: string, body: Uint8Array): Uint8Array {
  const head = enc.encode(header);
  const len = head.length + body.length + 2;
  const out = new Uint8Array(len + 2);
  out.set([0xff, marker, len >> 8, len & 0xff]);
  out.set(head, 4);
  out.set(body, 4 + head.length);
  return out;
}

/**
 * exifr does not read WebP, so its EXIF and XMP chunks are rewrapped as the
 * APP1 segments of an otherwise empty JPEG, which exifr does read.
 */
export function webpAsJpegMetadata(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [Uint8Array.from([0xff, 0xd8])];
  for (const c of riffChunks(b)) {
    let body = b.subarray(c.data, c.data + c.size);
    if (c.fourcc === 'EXIF') {
      // Some writers keep the JPEG "Exif\0\0" prefix inside the chunk.
      if (String.fromCharCode(...body.subarray(0, 4)) === 'Exif')
        body = body.subarray(6);
      parts.push(segment(0xe1, 'Exif\0\0', body));
    } else if (c.fourcc === 'XMP ')
      parts.push(segment(0xe1, 'http://ns.adobe.com/xap/1.0/\0', body));
  }
  parts.push(Uint8Array.from([0xff, 0xd9]));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const PARSE_OPTIONS = {
  tiff: true,
  ifd1: true,
  exif: true,
  gps: true,
  interop: true,
  xmp: true,
  iptc: true,
  icc: true,
  ihdr: true,
  jfif: false,
  makerNote: false,
  userComment: false,
  mergeOutput: false,
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
  sanitize: true,
};

/** Every metadata segment exifr finds, grouped for display. */
export async function readMetadata(bytes: Uint8Array): Promise<Metadata> {
  const format = sniffImage(bytes);
  if (!format)
    throw new ToolError(
      'INVALID_FILE',
      'This is not a JPEG, PNG, WebP, HEIC, AVIF or TIFF image',
    );
  let input: Uint8Array | null = bytes;
  if (format === 'webp') input = webpAsJpegMetadata(bytes);
  else if (format === 'heic' || format === 'avif') {
    input = normalizeIsoBoxes(bytes);
    if (!input)
      throw new ToolError(
        'INVALID_FILE',
        'This image is damaged (bad box sizes)',
      );
  }
  const { default: exifr } = await import('exifr');
  let raw: Record<string, unknown> | undefined;
  try {
    raw = (await exifr.parse(input, PARSE_OPTIONS)) as
      | Record<string, unknown>
      | undefined;
  } catch (cause) {
    throw new ToolError(
      'INVALID_FILE',
      'The metadata in this image is damaged',
      {
        cause,
      },
    );
  }
  const groups = Object.fromEntries(
    GROUPS.map((g) => [g, [] as [string, string][]]),
  ) as Metadata['groups'];
  let gps: Metadata['gps'];
  for (const [seg, values] of Object.entries(raw ?? {})) {
    if (values === null || typeof values !== 'object') continue;
    for (const [key, value] of Object.entries(
      values as Record<string, unknown>,
    )) {
      if (value === undefined) continue;
      const group = SEGMENT_GROUP[seg] ?? GROUP_OF.get(key) ?? 'other';
      groups[group].push([key, displayValue(value)]);
    }
    if (seg === 'gps') {
      const { latitude, longitude } = values as Record<string, unknown>;
      if (typeof latitude === 'number' && typeof longitude === 'number')
        gps = { lat: latitude, lon: longitude };
    }
  }
  let thumbnail: Uint8Array | undefined;
  if (format === 'jpeg') {
    const t = (await exifr.thumbnail(bytes).catch(() => undefined)) as
      | Uint8Array
      | undefined;
    if (t && t.byteLength > 0) thumbnail = new Uint8Array(t);
  }
  return {
    format,
    groups,
    ...(thumbnail ? { thumbnail } : {}),
    ...(gps ? { gps } : {}),
  };
}

/** True when nothing at all was found. */
export const isEmpty = (m: Metadata) =>
  GROUPS.every((g) => m.groups[g].length === 0);
