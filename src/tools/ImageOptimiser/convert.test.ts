import { describe, expect, it } from 'vitest';
import {
  aspectRatio,
  assertImageFile,
  mimeFor,
  reductionLabel,
} from './convert';

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
