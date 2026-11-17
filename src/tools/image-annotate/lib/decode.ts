import { ToolError } from '@/shared/lib/errors';
import { loadFile, type FileKind } from '@/shared/lib/files';

export const IMAGE_KINDS: FileKind[] = ['png', 'jpeg', 'webp', 'gif'];
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

/** Above this the browser's canvas limits (and memory) get in the way. */
export const MAX_PIXELS = 40_000_000;

export interface OpenedImage {
  bitmap: ImageBitmap;
  name: string;
  kind: FileKind;
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * Opens an image file: sniffed from its bytes (PNG, JPEG, WebP or GIF; a
 * GIF opens at its first frame), decoded with its EXIF orientation applied.
 */
export async function openImage(file: File): Promise<OpenedImage> {
  const loaded = await loadFile(file, IMAGE_KINDS);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(
      new Blob([loaded.bytes as Uint8Array<ArrayBuffer>], {
        type: MIME[loaded.kind],
      }),
      { imageOrientation: 'from-image' },
    );
  } catch (cause) {
    throw new ToolError('INVALID_FILE', `Could not decode ${file.name}`, {
      cause,
    });
  }
  if (bitmap.width * bitmap.height > MAX_PIXELS) {
    const { width, height } = bitmap;
    bitmap.close();
    throw new ToolError(
      'TOO_LARGE',
      `${file.name} is ${width} by ${height} pixels; images up to 40 megapixels can be edited`,
    );
  }
  return { bitmap, name: file.name || 'image.png', kind: loaded.kind };
}
