import { describe, expect, it } from 'vitest';
import { sideOf, toPlacement } from './position';

describe('toPlacement', () => {
  it('maps a centred side to the bare side', () => {
    expect(toPlacement('top', 'center')).toBe('top');
    expect(toPlacement('right', 'center')).toBe('right');
  });

  it('keeps start and end as logical alignments', () => {
    expect(toPlacement('bottom', 'start')).toBe('bottom-start');
    expect(toPlacement('left', 'end')).toBe('left-end');
  });
});

describe('sideOf', () => {
  it('reads the side of a resolved placement', () => {
    expect(sideOf('top-end')).toBe('top');
    expect(sideOf('left')).toBe('left');
  });
});
