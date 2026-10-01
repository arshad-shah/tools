import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from './errors';
import { convertToPng } from './image-convert';

const bitmap = { width: 30_000, height: 30_000, close: vi.fn() };

function stubCanvas(canvas: () => unknown) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => bitmap),
  );
  vi.stubGlobal(
    'OffscreenCanvas',
    vi.fn(function OffscreenCanvas() {
      return canvas();
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('convertToPng', () => {
  it('names the file when the browser cannot decode it', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new DOMException('The source image could not be decoded.');
      }),
    );
    await expect(
      convertToPng(new Uint8Array(4), 'webp', 'bad.webp'),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE',
      message: 'bad.webp could not be decoded as an image',
    });
  });

  it.each([
    [
      'the canvas cannot be created',
      () => {
        throw new RangeError('Invalid canvas size');
      },
    ],
    ['no 2D context is available', () => ({ getContext: () => null })],
    [
      'encoding fails',
      () => ({
        getContext: () => ({ drawImage: vi.fn() }),
        convertToBlob: async () => {
          throw new DOMException('Encoding failed');
        },
      }),
    ],
  ])('reports a user-facing error when %s', async (_case, canvas) => {
    stubCanvas(canvas);
    const error = await convertToPng(
      new Uint8Array(4),
      'gif',
      'huge.gif',
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ToolError);
    expect(error).toMatchObject({
      code: 'INVALID_FILE',
      message: 'huge.gif is too large to convert',
    });
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('returns the PNG bytes on success', async () => {
    stubCanvas(() => ({
      getContext: () => ({ drawImage: vi.fn() }),
      convertToBlob: async () => new Blob([new Uint8Array([1, 2, 3])]),
    }));
    expect(await convertToPng(new Uint8Array(4), 'webp', 'ok.webp')).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });
});
