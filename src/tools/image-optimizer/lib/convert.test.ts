import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  aspectRatio,
  convertImage,
  assertImageFile,
  isHexColor,
  mimeFor,
  needsBackground,
  qualityApplies,
  reductionLabel,
} from './convert';

describe('image-optimizer format rules', () => {
  it('flattens onto a background only for formats without alpha', () => {
    expect(needsBackground('jpeg')).toBe(true);
    expect(needsBackground('png')).toBe(false);
    expect(needsBackground('webp')).toBe(false);
  });
  it('offers quality only for lossy formats (PNG is lossless)', () => {
    expect(qualityApplies('jpeg')).toBe(true);
    expect(qualityApplies('webp')).toBe(true);
    expect(qualityApplies('png')).toBe(false);
  });
  it('accepts #rrggbb colours only', () => {
    expect(isHexColor('#ffffff')).toBe(true);
    expect(isHexColor('#A0b1C2')).toBe(true);
    expect(isHexColor('fff')).toBe(false);
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('red')).toBe(false);
  });
});

describe('image-optimizer helpers', () => {
  it('maps formats to MIME types', () => {
    expect(mimeFor('jpeg')).toBe('image/jpeg');
    expect(mimeFor('png')).toBe('image/png');
    expect(mimeFor('webp')).toBe('image/webp');
  });
  it('reduces aspect ratios', () => {
    expect(aspectRatio(1920, 1080)).toBe('16:9');
    expect(aspectRatio(0, 10)).toBe('Unknown');
  });
  it('labels size reduction like the old string-based version', () => {
    expect(reductionLabel(1000, 400)).toBe('60.0%');
    expect(reductionLabel(1000, 1000)).toBe('No reduction');
    expect(reductionLabel(1000, 1200)).toBe('No reduction');
    expect(reductionLabel(0, 10)).toBe('N/A');
  });
  it('rejects non-images with INVALID_FILE naming the file', () => {
    expect(() =>
      assertImageFile(new File(['x'], 'a.txt', { type: 'text/plain' })),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_FILE',
        message: 'a.txt is not an image',
      }),
    );
  });
  it('accepts any image/* type', () => {
    expect(() =>
      assertImageFile(new File(['x'], 'a.bmp', { type: 'image/bmp' })),
    ).not.toThrow();
  });
});

describe('convertImage', () => {
  it('rejects an invalid background colour before touching the image', async () => {
    await expect(
      convertImage(new Blob([]), {
        format: 'jpeg',
        quality: 0.8,
        background: 'not-a-colour',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('convertImage encoding', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stub = (blob: Blob | null) => {
    const ops: string[] = [];
    const ctx = {
      fillStyle: '',
      fillRect: () => ops.push(`fill ${ctx.fillStyle}`),
      drawImage: () => ops.push('draw'),
    };
    const convertToBlob = vi.fn(async () => {
      if (!blob) throw new Error('unsupported');
      return blob;
    });
    vi.stubGlobal(
      'Image',
      class {
        src = '';
        naturalWidth = 4;
        naturalHeight = 2;
        decode = async () => {};
      },
    );
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(
          public width: number,
          public height: number,
        ) {
          ops.push(`canvas ${width}x${height}`);
        }
        getContext = () => ctx;
        convertToBlob = convertToBlob;
      },
    );
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:x',
      revokeObjectURL: () => {},
    });
    return { ops, convertToBlob };
  };

  it('flattens JPEG onto the background and encodes with quality', async () => {
    const { ops, convertToBlob } = stub(
      new Blob([new Uint8Array([1, 2])], { type: 'image/jpeg' }),
    );
    const out = await convertImage(new Blob(['x']), {
      format: 'jpeg',
      quality: 0.7,
      background: '#123456',
    });
    expect(ops).toEqual(['canvas 4x2', 'fill #123456', 'draw']);
    expect(convertToBlob).toHaveBeenCalledWith({
      type: 'image/jpeg',
      quality: 0.7,
    });
    expect(out).toMatchObject({ mime: 'image/jpeg', width: 4, height: 2 });
    expect([...out.bytes]).toEqual([1, 2]);
  });

  it('encodes PNG without background or quality', async () => {
    const { ops, convertToBlob } = stub(new Blob(['p'], { type: 'image/png' }));
    await convertImage(new Blob(['x']), { format: 'png', quality: 0.5 });
    expect(ops).toEqual(['canvas 4x2', 'draw']);
    expect(convertToBlob).toHaveBeenCalledWith({
      type: 'image/png',
      quality: undefined,
    });
  });

  it('reports a format the browser cannot encode', async () => {
    stub(null);
    await expect(
      convertImage(new Blob(['x']), { format: 'webp', quality: 0.5 }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FEATURE' });
  });
});
