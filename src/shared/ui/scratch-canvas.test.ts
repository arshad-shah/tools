/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canvasToBlob,
  createScratchCanvas,
  hasScratchCanvas,
} from './scratch-canvas';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

class FakeOffscreen {
  constructor(
    public width: number,
    public height: number,
  ) {}
  convertToBlob = vi.fn(
    async (o: { type: string }) => new Blob(['x'], { type: o.type }),
  );
}

describe('createScratchCanvas', () => {
  it('uses OffscreenCanvas when the browser has it', () => {
    vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
    const c = createScratchCanvas(30, 20);
    expect(c).toBeInstanceOf(FakeOffscreen);
    expect([c.width, c.height]).toEqual([30, 20]);
  });

  it('falls back to a detached canvas element without OffscreenCanvas', () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    const c = createScratchCanvas(30, 20);
    expect(c).toBeInstanceOf(HTMLCanvasElement);
    expect([c.width, c.height]).toEqual([30, 20]);
    expect((c as HTMLCanvasElement).isConnected).toBe(false);
  });

  it('is unsupported with neither (a worker without OffscreenCanvas)', () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    vi.stubGlobal('document', undefined);
    expect(hasScratchCanvas()).toBe(false);
    expect(() => createScratchCanvas(1, 1)).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_FEATURE' }),
    );
  });
});

describe('canvasToBlob', () => {
  it('encodes an OffscreenCanvas with convertToBlob', async () => {
    vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
    const c = createScratchCanvas(2, 2) as unknown as FakeOffscreen;
    const blob = await canvasToBlob(
      c as unknown as OffscreenCanvas,
      'image/webp',
      0.5,
    );
    expect(blob?.type).toBe('image/webp');
    expect(c.convertToBlob).toHaveBeenCalledWith({
      type: 'image/webp',
      quality: 0.5,
    });
  });

  it('encodes a canvas element with toBlob', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    const c = createScratchCanvas(2, 2) as HTMLCanvasElement;
    const toBlob = vi
      .spyOn(c, 'toBlob')
      .mockImplementation((cb, type) => cb(new Blob(['x'], { type })));
    const blob = await canvasToBlob(c, 'image/jpeg', 0.7);
    expect(blob?.type).toBe('image/jpeg');
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.7,
    );
  });

  it('resolves null when the element cannot encode', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    const c = createScratchCanvas(2, 2) as HTMLCanvasElement;
    vi.spyOn(c, 'toBlob').mockImplementation(() => {
      throw new Error('not implemented');
    });
    expect(await canvasToBlob(c, 'image/png')).toBeNull();
  });
});
