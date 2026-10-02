/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processImage } from './pipeline';

const ctx = { signal: new AbortController().signal };

let g: {
  fillStyle: string;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  // An older browser: no OffscreenCanvas, only canvas elements.
  vi.stubGlobal('OffscreenCanvas', undefined);
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async (_b: Blob, o?: { resizeWidth?: number }) => ({
      width: o?.resizeWidth ?? 40,
      height: o?.resizeWidth ? o.resizeWidth / 2 : 20,
      close: vi.fn(),
    })),
  );
  g = {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    g as never,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    cb,
    type,
  ) {
    cb(new Blob([`${this.width}x${this.height}`], { type }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('processImage without OffscreenCanvas', () => {
  it('re-encodes on a detached canvas element', async () => {
    const out = await processImage(
      new Blob(['img']),
      {
        encoding: 'jpeg',
        quality: 0.8,
        background: '#102030',
        resize: { maxWidth: 20 },
      },
      ctx,
    );
    expect(out).toMatchObject({ mime: 'image/jpeg', width: 20, height: 10 });
    expect(new TextDecoder().decode(out.bytes)).toBe('20x10');
    expect(g.fillStyle).toBe('#102030');
    expect(g.fillRect).toHaveBeenCalledWith(0, 0, 20, 10);
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.8,
    );
  });

  it('is unsupported in a worker without OffscreenCanvas', async () => {
    vi.stubGlobal('document', undefined);
    await expect(
      processImage(
        new Blob(['img']),
        { encoding: 'png', quality: 1, background: '#ffffff' },
        ctx,
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FEATURE' });
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('still reports a format the browser cannot encode', async () => {
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((cb) =>
      cb(new Blob(['x'], { type: 'image/png' })),
    );
    await expect(
      processImage(
        new Blob(['img']),
        { encoding: 'webp', quality: 0.8, background: '#ffffff' },
        ctx,
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FEATURE' });
  });
});
