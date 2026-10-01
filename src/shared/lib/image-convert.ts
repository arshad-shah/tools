import { ToolError } from './errors';
import type { FileKind } from './files';

const MIME: Partial<Record<FileKind, string>> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * Decodes an image with the browser's own decoder (GIF: first frame) and
 * re-encodes it losslessly as PNG, keeping transparency. Browser only.
 */
export async function convertToPng(
  bytes: Uint8Array,
  kind: FileKind,
  name: string,
): Promise<Uint8Array> {
  const type = MIME[kind];
  if (!type) throw new ToolError('INVALID_FILE', `${name} is not an image`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(
      new Blob([bytes as Uint8Array<ArrayBuffer>], { type }),
    );
  } catch (cause) {
    throw new ToolError(
      'INVALID_FILE',
      `${name} could not be decoded as an image`,
      { cause },
    );
  }
  // Past decoding, failures come from the canvas: browsers refuse (or hand
  // out no context for) canvases above their size or memory limits.
  const tooLarge = (cause?: unknown) =>
    new ToolError('INVALID_FILE', `${name} is too large to convert`, {
      cause,
    });
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw tooLarge();
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await blob.arrayBuffer());
  } catch (e) {
    throw e instanceof ToolError ? e : tooLarge(e);
  } finally {
    bitmap.close();
  }
}
