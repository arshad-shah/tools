import { describe, expect, it } from 'vitest';
import {
  aspectRatio,
  assertImageFile,
  isHexColor,
  mimeFor,
  needsBackground,
  qualityApplies,
  reductionLabel,
} from './convert';

describe('image-optimizer format rules', () => {
  it('flattens onto a background only for formats without alpha', () => {
    expect(needsBackground('jpeg')).toBe(true);
    expect(needsBackground('png')).toBe(false);
    expect(needsBackground('webp')).toBe(false);
  });
  it('offers quality only for lossy formats (PNG is lossless)', () => {
    expect(qualityApplies('jpeg')).toBe(true);
    expect(qualityApplies('webp')).toBe(true);
    expect(qualityApplies('png')).toBe(false);
  });
  it('accepts #rrggbb colours only', () => {
    expect(isHexColor('#ffffff')).toBe(true);
    expect(isHexColor('#A0b1C2')).toBe(true);
    expect(isHexColor('fff')).toBe(false);
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('red')).toBe(false);
  });
});

describe('image-optimizer helpers', () => {
  it('maps formats to MIME types', () => {
    expect(mimeFor('jpeg')).toBe('image/jpeg');
    expect(mimeFor('png')).toBe('image/png');
    expect(mimeFor('webp')).toBe('image/webp');
  });
  it('reduces aspect ratios', () => {
    expect(aspectRatio(1920, 1080)).toBe('16:9');
    expect(aspectRatio(0, 10)).toBe('Unknown');
  });
  it('labels size reduction like the old string-based version', () => {
    expect(reductionLabel(1000, 400)).toBe('60.0%');
    expect(reductionLabel(1000, 1000)).toBe('No reduction');
    expect(reductionLabel(1000, 1200)).toBe('No reduction');
    expect(reductionLabel(0, 10)).toBe('N/A');
  });
  it('rejects non-images with INVALID_FILE naming the file', () => {
    expect(() =>
      assertImageFile(new File(['x'], 'a.txt', { type: 'text/plain' })),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_FILE',
        message: 'a.txt is not an image',
      }),
    );
  });
  it('accepts any image/* type', () => {
    expect(() =>
      assertImageFile(new File(['x'], 'a.bmp', { type: 'image/bmp' })),
    ).not.toThrow();
  });
});
