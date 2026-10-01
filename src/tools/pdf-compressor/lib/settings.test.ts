import { describe, expect, it } from 'vitest';
import { PRESETS } from '@/pdf/compress/pipeline';
import { fromAdvanced, matchPreset, toAdvanced } from './settings';

describe('compressor settings', () => {
  it('round-trips every preset and recognises it', () => {
    for (const id of ['lossless', 'balanced', 'strong'] as const) {
      expect(fromAdvanced(toAdvanced(PRESETS[id]))).toEqual(PRESETS[id]);
      expect(matchPreset(toAdvanced(PRESETS[id]))).toBe(id);
    }
  });

  it('becomes custom when any field differs', () => {
    expect(
      matchPreset({ ...toAdvanced(PRESETS.balanced), linearize: true }),
    ).toBe('custom');
    expect(
      matchPreset({ ...toAdvanced(PRESETS.balanced), targetDpi: 200 }),
    ).toBe('custom');
  });

  it('ignores DPI and quality when images are off, and clamps values', () => {
    expect(
      matchPreset({ ...toAdvanced(PRESETS.lossless), targetDpi: 300 }),
    ).toBe('lossless');
    expect(
      fromAdvanced({
        ...toAdvanced(PRESETS.balanced),
        targetDpi: 10.4,
        quality: 2,
      }).images,
    ).toEqual({ targetDpi: 50, quality: 0.95 });
    expect(
      fromAdvanced({
        ...toAdvanced(PRESETS.balanced),
        targetDpi: Number.NaN,
        quality: Number.NaN,
      }).images,
    ).toEqual({ targetDpi: 150, quality: 0.75 });
  });
});
