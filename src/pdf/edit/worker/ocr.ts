import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { loadOcrFonts } from '@/pdf/ocr/fonts';
import {
  writeTextLayer,
  type PageWords,
  type TextLayerResult,
} from '@/pdf/ocr/text-layer';

export const ocrHandlers = {
  /** Checkpoint ocr.textLayer: the invisible text layer for every page at once. */
  async writeTextLayer(
    _ctx: RpcContext,
    bytes: Uint8Array,
    pages: PageWords[],
  ): Promise<Transferred<TextLayerResult>> {
    const out = await writeTextLayer(bytes, pages, await loadOcrFonts());
    return new Transferred(out, [out.bytes.buffer as ArrayBuffer]);
  },
};
