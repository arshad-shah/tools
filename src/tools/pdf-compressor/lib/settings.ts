import {
  PRESETS,
  type CompressSettings,
  type PresetId,
} from '@/pdf/compress/pipeline';

export type PresetChoice = PresetId | 'custom';

/** The flat shape the advanced panel edits. */
export interface AdvancedSettings {
  recompressImages: boolean;
  targetDpi: number;
  quality: number;
  objectStreams: boolean;
  recompressFlate: boolean;
  removeUnreferenced: boolean;
  linearize: boolean;
  stripMetadata: boolean;
}

const DEFAULT_DPI = 150;
const DEFAULT_QUALITY = 0.75;

const clamp = (n: number, lo: number, hi: number, fallback: number) =>
  Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;

export function toAdvanced(s: CompressSettings): AdvancedSettings {
  return {
    recompressImages: s.images !== null,
    targetDpi: s.images?.targetDpi ?? DEFAULT_DPI,
    quality: s.images?.quality ?? DEFAULT_QUALITY,
    ...s.qpdf,
    stripMetadata: s.stripMetadata,
  };
}

/** DPI is clamped to a whole number 50–600 and quality to 0.3–0.95. */
export function fromAdvanced(a: AdvancedSettings): CompressSettings {
  return {
    images: a.recompressImages
      ? {
          targetDpi: Math.round(clamp(a.targetDpi, 50, 600, DEFAULT_DPI)),
          quality: clamp(a.quality, 0.3, 0.95, DEFAULT_QUALITY),
        }
      : null,
    qpdf: {
      objectStreams: a.objectStreams,
      recompressFlate: a.recompressFlate,
      removeUnreferenced: a.removeUnreferenced,
      linearize: a.linearize,
    },
    stripMetadata: a.stripMetadata,
  };
}

/** The preset these settings amount to, or 'custom'. */
export function matchPreset(a: AdvancedSettings): PresetChoice {
  // Both sides are built by the same object literals, so key order matches.
  const mine = JSON.stringify(fromAdvanced(a));
  return (
    (Object.keys(PRESETS) as PresetId[]).find(
      (id) => JSON.stringify(PRESETS[id]) === mine,
    ) ?? 'custom'
  );
}
