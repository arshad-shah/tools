import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { loadFile } from '@/shared/lib/files';
import { toEmbeddable } from '@/pdf/edit/image-embeddable';
import type { ModeProps } from '../types';
import { setEditUi } from './ui-store';

export const IMAGE_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif';

/** Reads an image (WebP and GIF become PNG), stores it and arms the Image tool. */
export async function pickImage(ctx: ModeProps, file: File) {
  try {
    const loaded = await loadFile(file, ['png', 'jpeg', 'webp', 'gif']);
    const { bytes, mime } = await toEmbeddable(loaded.bytes, file.name);
    const bitmap = await createImageBitmap(
      new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }),
    );
    const aspect = bitmap.width / Math.max(1, bitmap.height);
    bitmap.close();
    setEditUi({
      image: { assetId: ctx.doc.addAsset(bytes, mime), mime, aspect },
    });
    ctx.tool.set('image');
    ctx.doc.announce('Image ready: click a page to place it');
  } catch (e) {
    notify.error(toToolError(e));
  }
}
