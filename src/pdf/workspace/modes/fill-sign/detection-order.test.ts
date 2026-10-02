import { describe, expect, it } from 'vitest';
import { nextToDetect } from './data';

const pages = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => ({ id }));

describe('nextToDetect', () => {
  it('detects the pages on screen first, in document order', () => {
    expect(nextToDetect(pages, 'p4', ['p3', 'p4'])?.id).toBe('p3');
    expect(nextToDetect(pages.slice(3), 'p4', ['p3', 'p4'])?.id).toBe('p4');
  });

  it('then the current page, then the rest in order', () => {
    expect(nextToDetect(pages, 'p2', [])?.id).toBe('p2');
    expect(nextToDetect(pages, null, undefined)?.id).toBe('p1');
    expect(nextToDetect([], 'p1', ['p1'])).toBeUndefined();
  });
});
