import type { ImageEncoding } from '@/shared/lib/image/pipeline';

/** Format names as the preset and the estimate show them. */
export const ENCODING_LABELS: Record<ImageEncoding, string> = {
  webp: 'WebP',
  jpeg: 'JPEG',
  avif: 'AVIF',
  png: 'PNG (lossless)',
  'png-palette': 'PNG (256 colours)',
};
