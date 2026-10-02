import { ToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import {
  canvasToBlob,
  createScratchCanvas,
  hasScratchCanvas,
  scratchContext2D,
  type ScratchCanvas,
} from '@/shared/ui/scratch-canvas';
import { encodePalettePng } from './png-palette';
import { searchQuality } from './target-size';

export type ImageEncoding = 'jpeg' | 'webp' | 'png' | 'png-palette' | 'avif';

export interface ResizeSpec {
  maxWidth?: number;
  maxHeight?: number;
  /** 1 to 100; values over 100 never upscale. */
  percent?: number;
}

export interface ImageJob {
  encoding: ImageEncoding;
  /** 0 to 1; ignored by the lossless PNG encodings. */
  quality: number;
  /** `#rrggbb`, painted under formats without alpha (JPEG). */
  background: string;
  resize?: ResizeSpec;
  /** Binary-search the quality so the output fits this many bytes (lossy only). */
  targetBytes?: number;
}

export interface ImageResult {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
  qualityUsed?: number;
  targetMet?: boolean;
  note?: string;
}

export const MIME: Record<ImageEncoding, string> = {
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  png: 'image/png',
  'png-palette': 'image/png',
  avif: 'image/avif',
};

export const EXTENSION: Record<ImageEncoding, string> = {
  jpeg: 'jpg',
  webp: 'webp',
  png: 'png',
  'png-palette': 'png',
  avif: 'avif',
};

/** Encodings whose size depends on a quality value. */
export const isLossy = (e: ImageEncoding) =>
  e === 'jpeg' || e === 'webp' || e === 'avif';

/** JPEG has no alpha: transparent pixels are painted onto the background. */
export const needsBackground = (e: ImageEncoding) => e === 'jpeg';

export const MIN_TARGET_QUALITY = 0.3;

/** The output size for a resize: keeps the aspect ratio, never upscales. */
export function computeResize(
  width: number,
  height: number,
  resize: ResizeSpec = {},
): { width: number; height: number } {
  let factor = 1;
  if (resize.percent !== undefined)
    factor = Math.min(factor, resize.percent / 100);
  if (resize.maxWidth !== undefined)
    factor = Math.min(factor, resize.maxWidth / width);
  if (resize.maxHeight !== undefined)
    factor = Math.min(factor, resize.maxHeight / height);
  if (factor >= 1) return { width, height };
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}

const positive = (v: number | undefined) =>
  v === undefined || (Number.isFinite(v) && v > 0);

export function validateJob(job: ImageJob): void {
  if (!/^#[0-9a-f]{6}$/i.test(job.background))
    throw new ToolError(
      'INVALID_INPUT',
      `The background colour must be #rrggbb, not "${job.background}"`,
    );
  if (!(job.quality >= 0 && job.quality <= 1))
    throw new ToolError('INVALID_INPUT', 'The quality must be between 0 and 1');
  const r = job.resize ?? {};
  if (!positive(r.maxWidth) || !positive(r.maxHeight) || !positive(r.percent))
    throw new ToolError('INVALID_INPUT', 'Resize values must be above zero');
  if (!positive(job.targetBytes))
    throw new ToolError('INVALID_INPUT', 'The target size must be above zero');
}

const checkAborted = (signal: AbortSignal) => {
  if (signal.aborted) throw new ToolError('CANCELLED', 'Cancelled');
};

export type AvifEncoder = (
  image: ImageData,
  opts: { quality: number },
) => Promise<Uint8Array>;

async function canvasEncode(
  canvas: ScratchCanvas,
  encoding: Exclude<ImageEncoding, 'png-palette' | 'avif'>,
  quality: number,
): Promise<Uint8Array> {
  const type = MIME[encoding];
  const blob = await canvasToBlob(
    canvas,
    type,
    isLossy(encoding) ? quality : undefined,
  );
  // Browsers fall back to PNG for types they cannot encode.
  if (!blob || blob.type !== type)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `This browser cannot encode ${encoding.toUpperCase()}`,
    );
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Decode (upright, from EXIF orientation), high-quality resize, background
 * fill and encode. Browser or worker only: needs createImageBitmap, and
 * OffscreenCanvas or (on the main thread of an older browser) a canvas
 * element. Re-encoding drops every metadata segment.
 */
export async function processImage(
  file: Blob,
  job: ImageJob,
  ctx: Pick<RpcContext, 'signal'>,
  encodeAvif?: AvifEncoder,
): Promise<ImageResult> {
  validateJob(job);
  if (!hasScratchCanvas())
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot re-encode images (no OffscreenCanvas)',
    );
  let source: ImageBitmap;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'This image could not be decoded', {
      cause,
    });
  }
  let bitmap = source;
  try {
    checkAborted(ctx.signal);
    const { width, height } = computeResize(
      source.width,
      source.height,
      job.resize,
    );
    if (width !== source.width || height !== source.height) {
      bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      });
      checkAborted(ctx.signal);
    }
    const canvas = createScratchCanvas(width, height);
    const g = scratchContext2D(canvas);
    if (!g)
      throw new ToolError('INVALID_FILE', 'This image is too large to process');
    if (needsBackground(job.encoding)) {
      g.fillStyle = job.background;
      g.fillRect(0, 0, width, height);
    }
    g.drawImage(bitmap, 0, 0, width, height);

    const encodeAt = async (quality: number): Promise<Uint8Array> => {
      checkAborted(ctx.signal);
      switch (job.encoding) {
        case 'png-palette':
          return encodePalettePng(
            g.getImageData(0, 0, width, height).data,
            width,
            height,
          );
        case 'avif':
          if (!encodeAvif)
            throw new ToolError(
              'UNSUPPORTED_FEATURE',
              'AVIF encoding is not available here',
            );
          return encodeAvif(g.getImageData(0, 0, width, height), { quality });
        default:
          return canvasEncode(canvas, job.encoding, quality);
      }
    };

    const base = { mime: MIME[job.encoding], width, height };
    if (job.targetBytes === undefined || !isLossy(job.encoding)) {
      const bytes = await encodeAt(job.quality);
      return {
        ...base,
        bytes,
        ...(isLossy(job.encoding) ? { qualityUsed: job.quality } : {}),
        ...(job.targetBytes !== undefined
          ? { note: 'Target size applies to JPEG, WebP and AVIF only' }
          : {}),
      };
    }
    const target = job.targetBytes;
    const cache = new Map<number, Uint8Array>();
    const found = await searchQuality(
      async (q) => {
        const bytes = await encodeAt(q);
        cache.set(q, bytes);
        return bytes.byteLength;
      },
      target,
      {
        min: MIN_TARGET_QUALITY,
        max: Math.max(job.quality, MIN_TARGET_QUALITY),
      },
    );
    const bytes = cache.get(found.quality) ?? (await encodeAt(found.quality));
    return {
      ...base,
      bytes,
      qualityUsed: found.quality,
      targetMet: found.met,
      ...(found.met
        ? {}
        : {
            note: `Could not reach ${formatBytes(target)} at minimum quality ${MIN_TARGET_QUALITY}`,
          }),
    };
  } finally {
    if (bitmap !== source) bitmap.close();
    source.close();
  }
}
