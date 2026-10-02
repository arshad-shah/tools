import { afterEach, describe, expect, it, vi } from 'vitest';
import { BitmapCache } from './bitmap-cache';

const bmp = (width = 10, height = 10) =>
  ({ width, height, close: vi.fn() }) as unknown as ImageBitmap & {
    close: ReturnType<typeof vi.fn>;
  };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BitmapCache', () => {
  it('evicts least-recently-used bitmaps past the pixel budget and closes them', () => {
    const cache = new BitmapCache({ maxPixels: 200 });
    const a = bmp();
    const b = bmp();
    const c = bmp();
    cache.set('d1', 0, 100, a);
    cache.set('d1', 1, 100, b);
    cache.get('d1', 0, 100); // touch a
    cache.set('d1', 2, 100, c); // 300 px > 200: evicts b
    expect(cache.get('d1', 1, 100)).toBeUndefined();
    expect(b.close).toHaveBeenCalledOnce();
    expect(cache.get('d1', 0, 100)).toBe(a);
    expect(cache.size).toBe(2);
  });

  it('evicts as many as needed to fit a large bitmap', () => {
    const cache = new BitmapCache({ maxPixels: 1000 });
    const small = [bmp(), bmp(), bmp(), bmp()]; // 4 x 100 px
    small.forEach((b, i) => cache.set('d', i, 10, b));
    const big = bmp(30, 25); // 750 px
    cache.set('d', 9, 10, big);
    // 400 + 750 > 1000: the two oldest go (250 + 750 = 1000).
    expect(small[0].close).toHaveBeenCalledOnce();
    expect(small[1].close).toHaveBeenCalledOnce();
    expect(small[2].close).not.toHaveBeenCalled();
    expect(cache.size).toBe(3);
  });

  it('keeps a single bitmap larger than the budget alone', () => {
    const cache = new BitmapCache({ maxPixels: 100 });
    const a = bmp(5, 5);
    const b = bmp(5, 5);
    cache.set('d', 0, 10, a);
    cache.set('d', 1, 10, b);
    const huge = bmp(100, 100);
    cache.set('d', 2, 10, huge);
    expect(a.close).toHaveBeenCalledOnce();
    expect(b.close).toHaveBeenCalledOnce();
    expect(huge.close).not.toHaveBeenCalled();
    expect(cache.get('d', 2, 10)).toBe(huge);
    expect(cache.size).toBe(1);
  });

  it('replacing an entry closes the old bitmap and recounts its pixels', () => {
    const cache = new BitmapCache({ maxPixels: 200 });
    const old = bmp(10, 10);
    cache.set('d', 0, 10, old);
    cache.set('d', 0, 10, bmp(10, 10));
    expect(old.close).toHaveBeenCalledOnce();
    const other = bmp(10, 10);
    cache.set('d', 1, 10, other); // 200 px: fits
    expect(other.close).not.toHaveBeenCalled();
    expect(cache.size).toBe(2);
  });

  it('drops every bitmap of a document and frees its budget', () => {
    const cache = new BitmapCache({ maxPixels: 200 });
    const a = bmp();
    const other = bmp();
    cache.set('d1', 0, 100, a);
    cache.set('d2', 0, 100, other);
    cache.deleteDoc('d1');
    expect(a.close).toHaveBeenCalledOnce();
    expect(cache.get('d2', 0, 100)).toBe(other);
    cache.set('d2', 1, 100, bmp()); // 200 px again: nothing evicted
    expect(other.close).not.toHaveBeenCalled();
  });

  it('treats closed (zero-width) bitmaps as misses', () => {
    const cache = new BitmapCache({ maxPixels: 1000 });
    cache.set('d', 0, 100, bmp(0, 0));
    expect(cache.get('d', 0, 100)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('defaults to a 64M pixel budget on desktop', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const cache = new BitmapCache();
    const a = bmp(4096, 4096); // 16M
    for (let i = 0; i < 4; i++)
      cache.set('d', i, 1, i === 0 ? a : bmp(4096, 4096));
    expect(a.close).not.toHaveBeenCalled();
    cache.set('d', 9, 1, bmp(10, 10));
    expect(a.close).toHaveBeenCalledOnce();
  });

  it('defaults to a 24M pixel budget on narrow screens', () => {
    const query = vi.fn(() => ({ matches: true }));
    vi.stubGlobal('matchMedia', query);
    const cache = new BitmapCache();
    expect(query).toHaveBeenCalledWith('(max-width: 899px)');
    const a = bmp(4096, 3072); // 12M (half the budget)
    cache.set('d', 0, 1, a);
    cache.set('d', 1, 1, bmp(4096, 3072));
    expect(a.close).not.toHaveBeenCalled();
    cache.set('d', 2, 1, bmp(10, 10));
    expect(a.close).toHaveBeenCalledOnce();
  });

  it('works where matchMedia does not exist (Node, workers)', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(() => new BitmapCache()).not.toThrow();
  });

  it('counts tiles in the same pixel budget and tells listeners on eviction', () => {
    const cache = new BitmapCache({ maxPixels: 200 });
    const evicted = vi.fn();
    cache.subscribe(evicted);
    const page = bmp();
    const tile = bmp();
    cache.set('d1', 0, 100, page);
    cache.setTile('d1', 'tile:a', tile);
    expect(cache.getTile('tile:a')).toBe(tile);
    cache.setTile('d1', 'tile:b', bmp()); // 300 px: the page goes
    expect(page.close).toHaveBeenCalledOnce();
    expect(evicted).toHaveBeenCalled();
    cache.deleteDoc('d1');
    expect(tile.close).toHaveBeenCalledOnce();
    expect(cache.getTile('tile:a')).toBeUndefined();
  });
});
