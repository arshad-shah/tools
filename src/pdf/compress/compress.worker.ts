import { ownBuffer } from '@/shared/lib/bytes';
import {
  exposeRpc,
  Transferred,
  type RpcContext,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import { canvasCodec } from './canvas-codec';
import {
  prepareForCompression,
  type PrepareOptions,
  type PrepareResult,
} from './prepare';

const handlers = {
  async prepare(
    ctx: RpcContext,
    bytes: Uint8Array,
    opts: PrepareOptions,
  ): Promise<Transferred<PrepareResult>> {
    const r = await prepareForCompression(bytes, opts, canvasCodec, {
      signal: ctx.signal,
      progress: ctx.progress,
    });
    const out = ownBuffer(r.bytes);
    return new Transferred({ bytes: out, images: r.images }, [out.buffer]);
  },
};

export type CompressHandlers = typeof handlers;

exposeRpc(handlers, self as unknown as RpcEndpoint);
