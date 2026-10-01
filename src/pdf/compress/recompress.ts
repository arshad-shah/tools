import {
  PDFName,
  PDFNumber,
  PDFRawStream,
  type PDFDocument,
  type PDFRef,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { JobProgress } from '@/shared/state/useJob';
import type { ImageCodec, RawImage } from './codec';
import {
  decodeStream,
  filtersOf,
  inventoryImages,
  predictorOf,
  type ImageEntry,
} from './inventory';
import { resample, unpredictPng } from './pixels';

export interface ImageSettings {
  targetDpi: number;
  /** JPEG quality, 0.1–1. */
  quality: number;
}

export interface ImageReport {
  total: number;
  processed: number;
  unchanged: number;
  skipped: { reason: string; count: number }[];
  bytesBefore: number;
  bytesAfter: number;
}

/** Downsample only when meaningfully above target (5% tolerance). */
const DPI_TOLERANCE = 1.05;

/**
 * Image dictionary entries that stay valid on the re-encoded image. /Mask is
 * only ever a stencil stream here (colour-key arrays are ineligible), and a
 * stencil mask has its own size, so it carries over unchanged.
 */
const CARRIED_KEYS = [
  'Interpolate',
  'Intent',
  'Mask',
  'OC',
  'StructParent',
  'Name',
];

const toGray = (img: RawImage): RawImage => {
  if (img.channels === 1) return img;
  const out = new Uint8Array(img.width * img.height);
  for (let i = 0; i < out.length; i++) out[i] = img.pixels[i * 3];
  return { ...img, channels: 1, pixels: out };
};

const sizeOf = (stream: PDFRawStream, key: string) => {
  const v = stream.dict.lookup(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : 0;
};

async function decodePixels(
  stream: PDFRawStream,
  channels: 1 | 3,
  width: number,
  height: number,
  codec: ImageCodec,
): Promise<RawImage | null> {
  // Eligible images (and soft masks) have at most one filter.
  const filter = filtersOf(stream.dict)[0] ?? null;
  if (filter === 'DCTDecode') {
    const img = await codec.decodeJpeg(stream.contents);
    return img.width === width && img.height === height ? img : null;
  }
  let data = filter === 'FlateDecode' ? decodeStream(stream) : stream.contents;
  if (!data) return null;
  if (predictorOf(stream.dict) >= 10)
    data = unpredictPng(data, width, channels);
  const size = width * height * channels;
  return data.length < size
    ? null
    : { width, height, channels, pixels: data.subarray(0, size) };
}

type Outcome =
  | { before: number; after: number }
  | 'unchanged'
  | { skipped: string };

async function recompressOne(
  doc: PDFDocument,
  e: ImageEntry,
  s: ImageSettings,
  codec: ImageCodec,
): Promise<Outcome> {
  const stream = doc.context.lookup(e.ref) as PDFRawStream;
  const channels = e.components as 1 | 3;
  const image = await decodePixels(
    stream,
    channels,
    e.width,
    e.height,
    codec,
  ).catch(() => null);
  if (!image) return { skipped: 'unreadable image data' };
  let mask: { ref: PDFRef; stream: PDFRawStream; image: RawImage } | null =
    null;
  if (e.smask) {
    const ms = doc.context.lookup(e.smask) as PDFRawStream;
    const mi = await decodePixels(
      ms,
      1,
      sizeOf(ms, 'Width'),
      sizeOf(ms, 'Height'),
      codec,
    ).catch(() => null);
    if (!mi) return { skipped: 'unreadable soft mask' };
    mask = { ref: e.smask, stream: ms, image: toGray(mi) };
  }
  const scale =
    e.effectiveDpi && e.effectiveDpi > s.targetDpi * DPI_TOLERANCE
      ? s.targetDpi / e.effectiveDpi
      : 1;
  const w = Math.max(1, Math.round(e.width * scale));
  const h = Math.max(1, Math.round(e.height * scale));
  const jpeg = await codec.encodeJpeg(resample(image, w, h), s.quality);
  // The soft mask is resampled to the new image size, and stays lossless.
  const newMask = mask
    ? doc.context.flateStream(resample(mask.image, w, h).pixels, {
        Type: 'XObject',
        Subtype: 'Image',
        Width: w,
        Height: h,
        ColorSpace: 'DeviceGray',
        BitsPerComponent: 8,
      })
    : null;
  const before = stream.contents.length + (mask?.stream.contents.length ?? 0);
  const after = jpeg.bytes.length + (newMask?.contents.length ?? 0);
  if (after >= before) return 'unchanged';
  const replacement = doc.context.stream(jpeg.bytes, {
    Type: 'XObject',
    Subtype: 'Image',
    Width: w,
    Height: h,
    BitsPerComponent: 8,
    Filter: 'DCTDecode',
  });
  // An ICC profile only stays valid when the channel count is unchanged.
  const keepSpace = jpeg.channels === e.components;
  const space = stream.dict.get(PDFName.of('ColorSpace'));
  replacement.dict.set(
    PDFName.of('ColorSpace'),
    keepSpace && space
      ? space
      : PDFName.of(jpeg.channels === 1 ? 'DeviceGray' : 'DeviceRGB'),
  );
  for (const key of CARRIED_KEYS) {
    const v = stream.dict.get(PDFName.of(key));
    if (v) replacement.dict.set(PDFName.of(key), v);
  }
  if (mask && newMask) {
    doc.context.assign(mask.ref, newMask); // same ref: no orphaned old mask
    replacement.dict.set(PDFName.of('SMask'), mask.ref);
  }
  doc.context.assign(e.ref, replacement);
  return { before, after };
}

/**
 * Re-encodes every eligible image as JPEG, downsampled to `targetDpi` where
 * it is drawn larger than that, keeping each image only when the result is
 * smaller. Mutates `doc`; the caller saves.
 */
export async function recompressImages(
  doc: PDFDocument,
  settings: ImageSettings,
  codec: ImageCodec,
  ctx: { signal?: AbortSignal; progress?: (p: JobProgress) => void } = {},
): Promise<ImageReport> {
  if (
    !Number.isInteger(settings.targetDpi) ||
    settings.targetDpi < 36 ||
    settings.targetDpi > 1200
  )
    throw new ToolError(
      'INVALID_INPUT',
      'Target resolution must be a whole number from 36 to 1200 DPI',
    );
  if (!(settings.quality >= 0.1 && settings.quality <= 1))
    throw new ToolError(
      'INVALID_INPUT',
      'JPEG quality must be between 10% and 100%',
    );
  const entries = inventoryImages(doc);
  const skipped = new Map<string, number>();
  const skip = (reason: string) =>
    skipped.set(reason, (skipped.get(reason) ?? 0) + 1);
  let processed = 0;
  let unchanged = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;
  const eligible = entries.filter((e) => e.eligible);
  for (const e of entries) if (!e.eligible) skip(e.reason ?? 'unsupported');
  for (const [i, entry] of eligible.entries()) {
    ctx.signal?.throwIfAborted();
    ctx.progress?.({
      done: i,
      total: eligible.length,
      label: 'Recompressing images',
    });
    const r = await recompressOne(doc, entry, settings, codec);
    if (r === 'unchanged') unchanged++;
    else if ('skipped' in r) skip(r.skipped);
    else {
      processed++;
      bytesBefore += r.before;
      bytesAfter += r.after;
    }
  }
  ctx.signal?.throwIfAborted();
  return {
    total: entries.length,
    processed,
    unchanged,
    skipped: [...skipped]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    bytesBefore,
    bytesAfter,
  };
}
