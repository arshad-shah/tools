import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { stripMetadata } from '@/pdf/edit/metadata';
import {
  materialize,
  type MaterializePlan,
  type MaterializeResult,
} from '@/pdf/doc/materialize/materialize';

const materializeHandlers = {
  async materialize(
    ctx: RpcContext,
    plan: MaterializePlan,
  ): Promise<Transferred<MaterializeResult>> {
    const result = await materialize(plan, ctx);
    return new Transferred(result, [result.bytes.buffer as ArrayBuffer]);
  },
};

const metadataHandlers = {
  /** Export option "Remove document properties". */
  async stripMetadata(
    _ctx: RpcContext,
    bytes: Uint8Array,
  ): Promise<Transferred<Uint8Array>> {
    const out = await stripMetadata(bytes);
    return new Transferred(out, [out.buffer as ArrayBuffer]);
  },
};

/**
 * Every edit-worker handler. Append-only registry: later Parts add one
 * `...<module>Handlers` line each (forms, redaction, ...).
 */
export const editHandlers = {
  ...materializeHandlers,
  ...metadataHandlers,
};

export type EditHandlers = typeof editHandlers;
