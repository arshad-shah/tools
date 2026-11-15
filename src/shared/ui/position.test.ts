import { describe, expect, it } from 'vitest';
import { isRefAnchor, toPlacement } from './position';

describe('toPlacement', () => {
  it('keeps top and bottom', () => {
    expect(toPlacement('top')).toBe('top');
    expect(toPlacement('bottom')).toBe('bottom');
  });

  it('maps left and right to the inline start and end', () => {
    expect(toPlacement('left')).toBe('start');
    expect(toPlacement('right')).toBe('end');
  });
});

describe('isRefAnchor', () => {
  it('tells a ref from a virtual anchor', () => {
    expect(isRefAnchor({ current: null })).toBe(true);
    expect(isRefAnchor({ getBoundingClientRect: () => new DOMRect() })).toBe(
      false,
    );
  });
});
