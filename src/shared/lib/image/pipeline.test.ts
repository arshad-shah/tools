import { describe, expect, it } from 'vitest';
import { computeResize, validateJob } from './pipeline';

describe('computeResize', () => {
  it('fits a maximum width and keeps the aspect ratio', () => {
    expect(computeResize(4000, 3000, { maxWidth: 1000 })).toEqual({
      width: 1000,
      height: 750,
    });
  });

  it('fits a maximum height', () => {
    expect(computeResize(4000, 3000, { maxHeight: 300 })).toEqual({
      width: 400,
      height: 300,
    });
  });

  it('fits both bounds by the tighter one', () => {
    expect(
      computeResize(4000, 3000, { maxWidth: 1000, maxHeight: 500 }),
    ).toEqual({ width: 667, height: 500 });
  });

  it('scales by a percentage', () => {
    expect(computeResize(4000, 3000, { percent: 50 })).toEqual({
      width: 2000,
      height: 1500,
    });
  });

  it('never upscales', () => {
    expect(computeResize(400, 300, { maxWidth: 1000 })).toEqual({
      width: 400,
      height: 300,
    });
    expect(computeResize(400, 300, { percent: 150 })).toEqual({
      width: 400,
      height: 300,
    });
  });

  it('keeps the size without a resize and never goes below 1 px', () => {
    expect(computeResize(400, 300)).toEqual({ width: 400, height: 300 });
    expect(computeResize(4000, 1, { maxWidth: 100 })).toEqual({
      width: 100,
      height: 1,
    });
  });
});

describe('validateJob', () => {
  const base = {
    encoding: 'jpeg',
    quality: 0.8,
    background: '#ffffff',
  } as const;

  it('accepts a sane job', () => {
    expect(() => validateJob(base)).not.toThrow();
  });

  it('refuses a background that is not #rrggbb', () => {
    expect(() => validateJob({ ...base, background: 'red' })).toThrow(
      /#rrggbb/,
    );
  });

  it('refuses a quality outside 0 to 1', () => {
    expect(() => validateJob({ ...base, quality: 2 })).toThrow(/quality/i);
  });

  it('refuses bad resize and target values', () => {
    expect(() => validateJob({ ...base, resize: { maxWidth: 0 } })).toThrow();
    expect(() => validateJob({ ...base, resize: { percent: -5 } })).toThrow();
    expect(() => validateJob({ ...base, targetBytes: 0 })).toThrow();
  });
});
