import { toToolError } from '@/shared/lib/errors';
import { loadFile } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
import { toEmbeddable } from '@/pdf/edit/image-embeddable';
import type { ModeProps } from '../types';
import { setAnnotateUi } from './ui-store';

export const IMAGE_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif';

/** Reads an image for an image stamp (WebP and GIF become PNG) and arms the Stamp tool. */
export async function pickImageStamp(
  ctx: ModeProps,
  file: File,
): Promise<void> {
  try {
    const loaded = await loadFile(file, ['png', 'jpeg', 'webp', 'gif']);
    const { bytes, mime } = await toEmbeddable(loaded.bytes, file.name);
    const bitmap = await createImageBitmap(
      new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }),
    );
    const aspect = bitmap.width / Math.max(1, bitmap.height);
    bitmap.close();
    const assetId = ctx.doc.addAsset(bytes, mime);
    setAnnotateUi({ imageStamp: { assetId, mime, aspect }, stamp: null });
    ctx.tool.set('stamp');
    ctx.doc.announce('Image stamp ready: click a page to place it');
  } catch (e) {
    notify.error(toToolError(e));
  }
}
