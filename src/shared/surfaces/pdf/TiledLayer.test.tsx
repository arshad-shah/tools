/** @vitest-environment jsdom */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bitmapCache, pdfRender } from '@/pdf/render';
import { TiledLayer } from './TiledLayer';

const bmp = (width = 512, height = 512) =>
  ({ width, height, close: vi.fn() }) as unknown as ImageBitmap;

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  bitmapCache.deleteDoc('d1');
  bitmapCache.deleteDoc('other');
  vi.restoreAllMocks();
});

describe('TiledLayer', () => {
  it('counts tiles in the bitmap budget and asks again for an evicted visible tile', async () => {
    const renderTile = vi
      .spyOn(pdfRender, 'renderTile')
      .mockImplementation(async () => {
        // Each call gives a fresh bitmap; closing marks it evicted.
        const b = bmp();
        (b as unknown as { close: () => void }).close = () =>
          Object.defineProperty(b, 'width', { value: 0 });
        return b;
      });
    render(
      <TiledLayer
        docId="d1"
        pageIndex={0}
        scale={3}
        shown={{ width: 300, height: 300 }}
        crop={{ left: 0, top: 0, width: 300, height: 300 }}
        rotate={0}
        visible={{ left: 0, top: 0, width: 300, height: 300 }}
        label="Page 1"
      />,
    );
    await vi.waitFor(() => expect(renderTile).toHaveBeenCalled());
    await act(async () => {});
    expect(bitmapCache.size).toBeGreaterThan(0);
    const first = renderTile.mock.calls.length;
    // A huge page render pushes every tile out of the budget.
    await act(async () => {
      bitmapCache.set('other', 0, 1, bmp(10000, 10000));
    });
    await vi.waitFor(() =>
      expect(renderTile.mock.calls.length).toBeGreaterThan(first),
    );
  });
});
