import { describe, expect, it, vi } from 'vitest';
import { BitmapCache } from './bitmap-cache';

const bmp = (width = 10) =>
  ({ width, close: vi.fn() }) as unknown as ImageBitmap & {
    close: ReturnType<typeof vi.fn>;
  };

describe('BitmapCache', () => {
  it('evicts least-recently-used entries past capacity and closes them', () => {
    const cache = new BitmapCache(2);
    const a = bmp();
    const b = bmp();
    const c = bmp();
    cache.set('d1', 0, 100, a);
    cache.set('d1', 1, 100, b);
    cache.get('d1', 0, 100); // touch a
    cache.set('d1', 2, 100, c); // evicts b
    expect(cache.get('d1', 1, 100)).toBeUndefined();
    expect(b.close).toHaveBeenCalledOnce();
    expect(cache.get('d1', 0, 100)).toBe(a);
    expect(cache.size).toBe(2);
  });
  it('drops every bitmap of a document', () => {
    const cache = new BitmapCache(10);
    const a = bmp();
    const other = bmp();
    cache.set('d1', 0, 100, a);
    cache.set('d2', 0, 100, other);
    cache.deleteDoc('d1');
    expect(a.close).toHaveBeenCalledOnce();
    expect(cache.get('d2', 0, 100)).toBe(other);
  });
  it('treats closed (zero-width) bitmaps as misses', () => {
    const cache = new BitmapCache(10);
    cache.set('d', 0, 100, bmp(0));
    expect(cache.get('d', 0, 100)).toBeUndefined();
    expect(cache.size).toBe(0);
  });
  it('stays bounded for a 300-page document', () => {
    const cache = new BitmapCache(150);
    for (let i = 0; i < 300; i++) cache.set('big', i, 160, bmp());
    expect(cache.size).toBe(150);
  });
});
