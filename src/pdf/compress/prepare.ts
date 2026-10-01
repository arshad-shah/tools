import type { JobProgress } from '@/shared/state/useJob';
// Direct module imports keep other edit operations out of the worker bundle.
import { loadPdf } from '@/pdf/edit/load';
import { stripMetadataInPlace } from '@/pdf/edit/metadata';
import type { ImageCodec } from './codec';
import {
  recompressImages,
  type ImageReport,
  type ImageSettings,
} from './recompress';

export interface PrepareOptions {
  images: ImageSettings | null;
  stripMetadata: boolean;
}

export interface PrepareResult {
  bytes: Uint8Array;
  images: ImageReport | null;
}

/** Stage 1 (pdf-lib): image recompression and/or metadata removal. */
export async function prepareForCompression(
  bytes: Uint8Array,
  opts: PrepareOptions,
  codec: ImageCodec,
  ctx: { signal?: AbortSignal; progress?: (p: JobProgress) => void } = {},
): Promise<PrepareResult> {
  if (!opts.images && !opts.stripMetadata) return { bytes, images: null };
  const doc = await loadPdf(bytes);
  const images = opts.images
    ? await recompressImages(doc, opts.images, codec, ctx)
    : null;
  if (opts.stripMetadata) stripMetadataInPlace(doc);
  ctx.signal?.throwIfAborted();
  // qpdf regenerates object streams next; skip pdf-lib's here.
  return { bytes: await doc.save({ useObjectStreams: false }), images };
}
