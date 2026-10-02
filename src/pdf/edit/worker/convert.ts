import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import {
  imagesToPdf,
  type ImageInput,
  type ImagesToPdfOptions,
} from '@/pdf/edit/images';

/** Convert mode handlers of the edit worker (spec 7.2). */
export const convertHandlers = {
  /** "Insert images as pages": one PDF page per image, in order. */
  async imagesToPdf(
    _ctx: RpcContext,
    images: ImageInput[],
    opts: ImagesToPdfOptions,
  ): Promise<Transferred<Uint8Array>> {
    const out = await imagesToPdf(images, opts);
    return new Transferred(out, [out.buffer as ArrayBuffer]);
  },
};
