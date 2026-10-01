import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { bitmapKey, pickPageBitmap } from './bitmap-state';

const bmp = (width = 10) => ({ width }) as ImageBitmap;
const none = { bitmap: null, error: null };

describe('pickPageBitmap', () => {
  const k = bitmapKey('d', 0, 100);

  it('returns nothing without a key', () => {
    expect(
      pickPageBitmap(null, { key: k, bitmap: bmp(), error: null }),
    ).toEqual(none);
  });
  it('prefers a live cached bitmap', () => {
    const cached = bmp();
    expect(pickPageBitmap(k, null, cached)).toEqual({
      bitmap: cached,
      error: null,
    });
  });
  it('ignores a closed cached bitmap and falls back to state', () => {
    const fresh = bmp();
    expect(
      pickPageBitmap(k, { key: k, bitmap: fresh, error: null }, bmp(0)),
    ).toEqual({ bitmap: fresh, error: null });
  });
  it('never returns state that belongs to another key', () => {
    const err = new ToolError('UNKNOWN', 'x');
    expect(
      pickPageBitmap(k, {
        key: bitmapKey('d', 1, 100),
        bitmap: bmp(),
        error: err,
      }),
    ).toEqual(none);
  });
  it('never returns a closed (zero-width) bitmap from state', () => {
    expect(pickPageBitmap(k, { key: k, bitmap: bmp(0), error: null })).toEqual(
      none,
    );
  });
  it('returns the error for the current key', () => {
    const err = new ToolError('UNKNOWN', 'x');
    expect(pickPageBitmap(k, { key: k, bitmap: null, error: err })).toEqual({
      bitmap: null,
      error: err,
    });
  });
});
