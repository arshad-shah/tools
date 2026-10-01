import type { OptimizeOptions } from '@arshad-shah/qpdf-wasm';
import type { JobContext } from '@/shared/state/useJob';
import type { PrepareOptions, PrepareResult } from './prepare';
import type { ImageReport, ImageSettings } from './recompress';

export interface QpdfSettings {
  objectStreams: boolean;
  recompressFlate: boolean;
  removeUnreferenced: boolean;
  linearize: boolean;
}

export interface CompressSettings {
  /** null: leave images alone (lossless). */
  images: ImageSettings | null;
  qpdf: QpdfSettings;
  stripMetadata: boolean;
}

export type PresetId = 'lossless' | 'balanced' | 'strong';

const QPDF_DEFAULT: QpdfSettings = {
  objectStreams: true,
  recompressFlate: true,
  removeUnreferenced: true,
  linearize: false,
};

export const PRESETS: Record<PresetId, CompressSettings> = {
  lossless: { images: null, qpdf: QPDF_DEFAULT, stripMetadata: false },
  balanced: {
    images: { targetDpi: 150, quality: 0.75 },
    qpdf: QPDF_DEFAULT,
    stripMetadata: false,
  },
  strong: {
    images: { targetDpi: 96, quality: 0.6 },
    qpdf: QPDF_DEFAULT,
    stripMetadata: true,
  },
};

export interface StageReport {
  id: 'images' | 'restructure';
  label: string;
  before: number;
  after: number;
}

export interface CompressReport {
  inputSize: number;
  outputSize: number;
  stages: StageReport[];
  images: ImageReport | null;
  warnings: string[];
  /** The result was not smaller, so the input is returned unchanged. */
  keptOriginal: boolean;
}

export interface CompressDeps {
  prepare(
    bytes: Uint8Array,
    opts: PrepareOptions,
    ctx: JobContext,
  ): Promise<PrepareResult>;
  optimize(
    bytes: Uint8Array,
    options: OptimizeOptions,
    signal: AbortSignal,
  ): Promise<{ bytes: Uint8Array; warnings: string[] }>;
}

/**
 * Spec §3.5's pipeline: (1) recompress images / strip metadata with pdf-lib,
 * (2) restructure with qpdf, (3) keep the original if nothing was gained.
 */
export async function compressPdf(
  bytes: Uint8Array,
  settings: CompressSettings,
  deps: CompressDeps,
  ctx: JobContext,
): Promise<{ bytes: Uint8Array; report: CompressReport }> {
  ctx.signal.throwIfAborted();
  const stages: StageReport[] = [];
  let current = bytes;
  let images: ImageReport | null = null;
  if (settings.images || settings.stripMetadata) {
    const label = settings.images
      ? settings.stripMetadata
        ? 'Images & metadata'
        : 'Images'
      : 'Metadata';
    ctx.progress({
      done: 0,
      total: 1,
      label: settings.images ? 'Recompressing images' : 'Removing metadata',
    });
    const r = await deps.prepare(
      current,
      { images: settings.images, stripMetadata: settings.stripMetadata },
      ctx,
    );
    stages.push({
      id: 'images',
      label,
      before: current.length,
      after: r.bytes.length,
    });
    current = r.bytes;
    images = r.images;
  }
  ctx.signal.throwIfAborted();
  ctx.progress({ done: 0, total: 1, label: 'Restructuring' });
  const q = settings.qpdf;
  const optimized = await deps.optimize(
    current,
    {
      objectStreams: q.objectStreams ? 'generate' : 'preserve',
      compressStreams: true,
      recompressFlate: q.recompressFlate,
      removeUnreferenced: q.removeUnreferenced,
      linearize: q.linearize,
    },
    ctx.signal,
  );
  ctx.signal.throwIfAborted();
  stages.push({
    id: 'restructure',
    label: 'Restructure (qpdf)',
    before: current.length,
    after: optimized.bytes.length,
  });
  const keptOriginal = optimized.bytes.length >= bytes.length;
  const out = keptOriginal ? bytes : optimized.bytes;
  return {
    bytes: out,
    report: {
      inputSize: bytes.length,
      outputSize: out.length,
      stages,
      images,
      warnings: optimized.warnings,
      keptOriginal,
    },
  };
}
