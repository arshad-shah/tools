import { describe, expect, it } from 'vitest';
import {
  encodeJpeg,
  noiseImage,
  withExifOrientation,
} from '../../../test/fixtures/images';
import { jpegOrientation, orientationMatrix } from './exif';

const jpg = encodeJpeg(8, 4, noiseImage(8, 4, 4));

describe('jpegOrientation', () => {
  it('is 1 when the JPEG has no EXIF block', () => {
    expect(jpegOrientation(jpg)).toBe(1);
  });
  it.each([1, 3, 6, 8])('reads orientation %i (big-endian TIFF)', (o) => {
    expect(jpegOrientation(withExifOrientation(jpg, o))).toBe(o);
  });
  it('reads little-endian TIFF headers', () => {
    expect(jpegOrientation(withExifOrientation(jpg, 6, 'II'))).toBe(6);
  });
  it('ignores garbage instead of throwing', () => {
    const truncated = withExifOrientation(jpg, 6).subarray(0, 20);
    expect(jpegOrientation(truncated)).toBe(1);
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8]))).toBe(1);
    expect(jpegOrientation(withExifOrientation(jpg, 42))).toBe(1);
  });
});

describe('orientationMatrix', () => {
  // Where the stored image's corners land on the page, box = (10, 20, 30, 40).
  const box = { x: 10, y: 20, width: 30, height: 40 };
  const apply = (m: number[], u: number, v: number) => [
    m[0] * u + m[2] * v + m[4],
    m[1] * u + m[3] * v + m[5],
  ];
  // PDF image space: (0, 1) is the stored top-left pixel.
  const topLeft = (o: number) => apply(orientationMatrix(o, box), 0, 1);
  const topRight = (o: number) => apply(orientationMatrix(o, box), 1, 1);

  it('is a plain scale + translate for orientation 1', () => {
    expect(orientationMatrix(1, box)).toEqual([30, 0, 0, 40, 10, 20]);
  });
  it('rotates 90° clockwise for orientation 6', () => {
    expect(topLeft(6)).toEqual([40, 60]); // displayed top-right
    expect(topRight(6)).toEqual([40, 20]); // displayed bottom-right
  });
  it('rotates 90° counter-clockwise for orientation 8', () => {
    expect(topLeft(8)).toEqual([10, 20]); // displayed bottom-left
    expect(topRight(8)).toEqual([10, 60]); // displayed top-left
  });
  it('rotates 180° for orientation 3 and mirrors for 2', () => {
    expect(topLeft(3)).toEqual([40, 20]);
    expect(topLeft(2)).toEqual([40, 60]);
    expect(topRight(2)).toEqual([10, 60]);
  });
});

describe('orientation table (all 8, from the EXIF definitions)', () => {
  const box = { x: 10, y: 20, width: 30, height: 40 };
  // Displayed position (dx, dy; 0–1, y down) of the stored top-left,
  // top-right and bottom-left pixels.
  const shown: Record<number, [number, number][]> = {
    1: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    2: [
      [1, 0],
      [0, 0],
      [1, 1],
    ], // mirror horizontally
    3: [
      [1, 1],
      [0, 1],
      [1, 0],
    ], // rotate 180°
    4: [
      [0, 1],
      [1, 1],
      [0, 0],
    ], // mirror vertically
    5: [
      [0, 0],
      [0, 1],
      [1, 0],
    ], // transpose
    6: [
      [1, 0],
      [1, 1],
      [0, 0],
    ], // rotate 90° clockwise
    7: [
      [1, 1],
      [1, 0],
      [0, 1],
    ], // transverse
    8: [
      [0, 1],
      [0, 0],
      [1, 1],
    ], // rotate 90° counter-clockwise
  };
  // PDF image space (v up) of the same stored corners.
  const stored: [number, number][] = [
    [0, 1],
    [1, 1],
    [0, 0],
  ];

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('orientation %i', (o) => {
    const m = orientationMatrix(o, box);
    stored.forEach(([u, v], i) => {
      const [dx, dy] = shown[o][i];
      expect([m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5]]).toEqual([
        box.x + box.width * dx,
        box.y + box.height * (1 - dy),
      ]);
    });
    expect(jpegOrientation(withExifOrientation(jpg, o))).toBe(o);
  });
});
