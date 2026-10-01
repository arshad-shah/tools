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

/** Re-encodes an image in the browser through a canvas. */
export async function convertImage(
  file: Blob,
  opts: { format: OutputFormat; quality: number },
  signal?: AbortSignal,
): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'This image could not be decoded', {
      cause,
    });
  }
  try {
    if (signal?.aborted) throw new ToolError('CANCELLED', 'Cancelled');
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ToolError('UNKNOWN', 'Unable to get canvas context');
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        mimeFor(opts.format),
        opts.format === 'png' ? undefined : opts.quality,
      ),
    );
    if (!blob)
      throw new ToolError(
        'UNSUPPORTED_FEATURE',
        `This browser cannot encode ${opts.format.toUpperCase()}`,
      );
    return { blob, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
