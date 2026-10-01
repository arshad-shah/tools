import { ToolError } from '@/shared/lib/errors';

export type OutputFormat = 'jpeg' | 'png' | 'webp';

export const mimeFor = (f: OutputFormat) => `image/${f}`;

export function aspectRatio(w: number, h: number): string {
  if (!w || !h) return 'Unknown';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

/** `'60.0%'`, `'No reduction'` when the output is not smaller, `'N/A'` without an input size. */
export function reductionLabel(before: number, after: number): string {
  if (!(before > 0)) return 'N/A';
  const r = ((before - after) / before) * 100;
  return r <= 0 ? 'No reduction' : `${r.toFixed(1)}%`;
}

export function assertImageFile(file: File): void {
  if (!file.type.startsWith('image/'))
    throw new ToolError('INVALID_FILE', `${file.name} is not an image`);
}

/**
 * Decodes with an <img> over an object URL. Unlike createImageBitmap, this
 * also handles SVG. The URL is revoked once decoded; the element stays
 * drawable.
 */
export async function decodeImage(
  file: Blob,
): Promise<{ image: HTMLImageElement; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'This image could not be decoded', {
      cause,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height)
    throw new ToolError('INVALID_FILE', 'This image has no intrinsic size');
  return { image, width, height };
}

/** Re-encodes an image in the browser through a canvas. */
export async function convertImage(
  file: Blob,
  opts: { format: OutputFormat; quality: number },
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; mime: string; width: number; height: number }> {
  const { image, width, height } = await decodeImage(file);
  if (signal?.aborted) throw new ToolError('CANCELLED', 'Cancelled');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ToolError('UNKNOWN', 'Unable to get canvas context');
  ctx.drawImage(image, 0, 0, width, height);
  const mime = mimeFor(opts.format);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(
      resolve,
      mime,
      opts.format === 'png' ? undefined : opts.quality,
    ),
  );
  if (!blob)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `This browser cannot encode ${opts.format.toUpperCase()}`,
    );
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mime: blob.type || mime,
    width,
    height,
  };
}
