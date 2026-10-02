import { describe, expect, it } from 'vitest';
import { scaleEstimate, smallestEstimate } from './estimate';

describe('format estimates', () => {
  it('scales the sample size by the pixel ratio', () => {
    expect(
      scaleEstimate(
        10_000,
        { width: 512, height: 384 },
        { width: 4096, height: 3072 },
      ),
    ).toBe(640_000);
  });

  it('never scales down when the image is smaller than the sample', () => {
    expect(
      scaleEstimate(
        5_000,
        { width: 200, height: 100 },
        { width: 200, height: 100 },
      ),
    ).toBe(5_000);
  });

  it('picks the smallest supported format', () => {
    expect(
      smallestEstimate([
        { encoding: 'jpeg', bytes: 900 },
        { encoding: 'avif', bytes: null },
        { encoding: 'webp', bytes: 700 },
        { encoding: 'png', bytes: 5_000 },
      ]),
    ).toBe('webp');
    expect(smallestEstimate([{ encoding: 'avif', bytes: null }])).toBeNull();
  });
});
