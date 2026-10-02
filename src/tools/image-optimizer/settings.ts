import { createToolSettings } from '@/shared/lib/tool-settings';
import type { ImageEncoding, ImageJob } from '@/shared/lib/image/pipeline';

export type ResizeMode = 'none' | 'max' | 'percent';

export type ImageSettings = {
  encoding: ImageEncoding;
  /** 0 to 1. */
  quality: number;
  background: string;
  resize: {
    mode: ResizeMode;
    maxWidth: number;
    maxHeight: number;
    percent: number;
  };
  /** Target size in KB; 0 means off. */
  targetKB: number;
};

export const IMAGE_DEFAULTS: ImageSettings = {
  encoding: 'webp',
  quality: 0.8,
  background: '#ffffff',
  resize: { mode: 'none', maxWidth: 1920, maxHeight: 1920, percent: 50 },
  targetKB: 0,
};

export const imageSettings = createToolSettings<ImageSettings>(
  'image-optimizer',
  IMAGE_DEFAULTS,
  { version: 1 },
);

/** The worker job for the current preset. */
export function jobFromSettings(s: ImageSettings): ImageJob {
  const resize =
    s.resize.mode === 'max'
      ? {
          ...(s.resize.maxWidth > 0 ? { maxWidth: s.resize.maxWidth } : {}),
          ...(s.resize.maxHeight > 0 ? { maxHeight: s.resize.maxHeight } : {}),
        }
      : s.resize.mode === 'percent'
        ? { percent: s.resize.percent }
        : undefined;
  return {
    encoding: s.encoding,
    quality: s.quality,
    background: s.background,
    ...(resize ? { resize } : {}),
    ...(s.targetKB > 0 ? { targetBytes: Math.round(s.targetKB * 1024) } : {}),
  };
}
