import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { canvasCodec } from '@/pdf/compress/canvas-codec';
import {
  drawOverlayText,
  redactPages,
  type PageMarks,
  type RedactMark,
  type RedactPagesResult,
} from '@/pdf/redact/apply';
import { replaceWithImage } from '@/pdf/redact/rasterise';

/** Redaction handlers of the edit worker (spec 10.2). */
export const redactHandlers = {
  async redactPages(
    _ctx: RpcContext,
    bytes: Uint8Array,
    pages: PageMarks[],
    terms: string[],
  ): Promise<Transferred<RedactPagesResult>> {
    const r = await redactPages(bytes, pages, terms, { codec: canvasCodec });
    return new Transferred(r, [r.bytes.buffer as ArrayBuffer]);
  },

  async drawOverlayText(
    _ctx: RpcContext,
    bytes: Uint8Array,
    pages: PageMarks[],
  ): Promise<Transferred<Uint8Array>> {
    const out = await drawOverlayText(bytes, pages);
    return new Transferred(out, [out.buffer as ArrayBuffer]);
  },

  async replaceWithImage(
    _ctx: RpcContext,
    bytes: Uint8Array,
    pageIndex: number,
    image: Uint8Array,
    mime: 'image/png' | 'image/jpeg',
    marks: RedactMark[],
  ): Promise<Transferred<Uint8Array>> {
    const out = await replaceWithImage(bytes, pageIndex, image, mime, marks);
    return new Transferred(out, [out.buffer as ArrayBuffer]);
  },
};
