import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { encodeAvif } from '@/shared/lib/image/avif';
import { extractPalette } from '@/shared/lib/image/extract';
import { processImage, type ImageJob } from '@/shared/lib/image/pipeline';

/** Every image-worker handler (spec §4.4, 6-G1). */
export const imageHandlers = {
  async process(ctx: RpcContext, file: Blob, job: ImageJob) {
    const result = await processImage(file, job, ctx, encodeAvif);
    return new Transferred(result, [result.bytes.buffer]);
  },
  extractPalette(ctx: RpcContext, file: Blob, k: number) {
    return extractPalette(file, k, ctx);
  },
};

export type ImageHandlers = typeof imageHandlers;
