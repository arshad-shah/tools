import { afterEach, describe, expect, it, vi } from 'vitest';

const wasmEncode = vi.fn(() => Promise.resolve(new Uint8Array([9, 9]).buffer));
const wasmInit = vi.fn(() => Promise.resolve({}));
vi.mock('@jsquash/avif/encode.js', () => ({
  default: wasmEncode,
  init: wasmInit,
}));
vi.mock('@jsquash/avif/codec/enc/avif_enc.wasm?url', () => ({
  default: '/assets/avif_enc.wasm',
}));

const { encodeAvif } = await import('./avif');

function fakeCanvas(blobType: string) {
  return class {
    constructor(
      readonly width: number,
      readonly height: number,
    ) {}
    getContext() {
      return { putImageData: () => {} };
    }
    convertToBlob() {
      return Promise.resolve(
        new Blob([new Uint8Array([1, 2, 3])], { type: blobType }),
      );
    }
  };
}

const image = {
  width: 2,
  height: 2,
  data: new Uint8ClampedArray(16),
} as ImageData;

afterEach(() => {
  vi.unstubAllGlobals();
  wasmEncode.mockClear();
  wasmInit.mockClear();
});

describe('encodeAvif', () => {
  it('uses the browser encoder when the blob really is AVIF', async () => {
    vi.stubGlobal('OffscreenCanvas', fakeCanvas('image/avif'));
    expect([...(await encodeAvif(image, { quality: 0.5 }))]).toEqual([1, 2, 3]);
    expect(wasmEncode).not.toHaveBeenCalled();
  });

  it('falls back to the same-origin WASM when the browser hands back another type', async () => {
    vi.stubGlobal('OffscreenCanvas', fakeCanvas('image/png'));
    expect([...(await encodeAvif(image, { quality: 0.5 }))]).toEqual([9, 9]);
    expect(wasmEncode).toHaveBeenCalledWith(image, { quality: 50 });
    const opts = (
      wasmInit.mock.calls[0] as unknown as [{ locateFile(): string }]
    )[0];
    expect(opts.locateFile()).toBe('/assets/avif_enc.wasm');
  });
});
