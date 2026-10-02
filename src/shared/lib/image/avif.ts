import { ToolError } from '@/shared/lib/errors';

let wasm: Promise<
  (image: ImageData, quality: number) => Promise<ArrayBuffer>
> | null = null;

/**
 * The lazy `@jsquash/avif` encoder. Its wasm is a Vite `?url` asset, so it is
 * served from our own origin; the single-threaded build is used because the
 * app is not cross-origin isolated (no SharedArrayBuffer).
 */
function loadWasmEncoder() {
  wasm ??= (async () => {
    const [{ default: encode, init }, { default: wasmUrl }] = await Promise.all(
      [
        import('@jsquash/avif/encode.js'),
        import('@jsquash/avif/codec/enc/avif_enc.wasm?url'),
      ],
    );
    await init({ locateFile: () => wasmUrl });
    return (image: ImageData, quality: number) =>
      encode(image, { quality: Math.round(quality * 100) });
  })().catch((cause: unknown) => {
    wasm = null;
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'The AVIF encoder could not load',
      {
        cause,
      },
    );
  });
  return wasm;
}

async function canvasAvif(
  image: ImageData,
  quality: number,
): Promise<Uint8Array | null> {
  if (typeof OffscreenCanvas === 'undefined') return null;
  const canvas = new OffscreenCanvas(image.width, image.height);
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.putImageData(image, 0, 0);
  const blob = await canvas
    .convertToBlob({ type: 'image/avif', quality })
    .catch(() => null);
  // Browsers without an AVIF encoder silently hand back a PNG.
  if (!blob || blob.type !== 'image/avif') return null;
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * AVIF: the browser's own encoder when it has one, otherwise the lazy WASM
 * encoder. `quality` is 0 to 1.
 */
export async function encodeAvif(
  image: ImageData,
  { quality }: { quality: number },
): Promise<Uint8Array> {
  const native = await canvasAvif(image, quality);
  if (native) return native;
  const encode = await loadWasmEncoder();
  try {
    return new Uint8Array(await encode(image, quality));
  } catch (cause) {
    throw new ToolError('UNKNOWN', 'AVIF encoding failed', { cause });
  }
}
