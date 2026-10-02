import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { cleanSignaturePhoto } from './pipeline';
import { countInk, syntheticPhoto } from './test-images';

describe('cleanSignaturePhoto', () => {
  it('extracts the scribble, measures the 6 degree skew and drops the border strip', () => {
    const { mask, angle, inkPixels } = cleanSignaturePhoto(
      syntheticPhoto(),
      400,
      200,
    );
    expect(Math.abs(angle - 6)).toBeLessThanOrEqual(1);
    expect(inkPixels).toBe(countInk(mask));
    // The scribble is about 260 px long and 8 px thick.
    expect(inkPixels).toBeGreaterThan(1500);
    // Cropped tightly around the scribble (plus margin), not the photo.
    expect(mask.width).toBeGreaterThan(260);
    expect(mask.width).toBeLessThan(300);
    expect(mask.height).toBeLessThan(90);
    // The straightened scribble lies level: no stray strip at either side.
    let left = 0;
    for (let y = 0; y < mask.height; y++)
      for (let x = 0; x < 8; x++) left += mask.data[y * mask.width + x];
    expect(left).toBe(0);
  });

  it('downscales large photos to 1600 px on the long side', () => {
    const w = 1800,
      h = 300;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 140; y < 160; y++)
      for (let x = 300; x < 1500; x++)
        rgba.fill(0, (y * w + x) * 4, (y * w + x) * 4 + 3);
    const { mask } = cleanSignaturePhoto(rgba, w, h);
    expect(mask.width).toBeLessThan(1600);
    expect(mask.width).toBeGreaterThan(1000);
  });

  it('rejects an empty white photo', () => {
    const rgba = new Uint8ClampedArray(300 * 200 * 4).fill(255);
    let error: unknown;
    try {
      cleanSignaturePhoto(rgba, 300, 200);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ToolError);
    expect((error as ToolError).code).toBe('INVALID_INPUT');
    expect((error as ToolError).message).toBe(
      'No signature found in this photo. Use dark ink on light paper and fill the frame.',
    );
  });
});
