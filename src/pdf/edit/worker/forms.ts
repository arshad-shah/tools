import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { createFields, flattenForm, type NewField } from '../forms-create';

/** Fill & Sign checkpoints (form.flatten, flat.makeFillable). */
export const formHandlers = {
  async flattenForm(
    _ctx: RpcContext,
    bytes: Uint8Array,
  ): Promise<Transferred<{ bytes: Uint8Array; fields: number }>> {
    const out = await flattenForm(bytes);
    return new Transferred(out, [out.bytes.buffer as ArrayBuffer]);
  },

  async createFields(
    _ctx: RpcContext,
    bytes: Uint8Array,
    fields: NewField[],
  ): Promise<Transferred<{ bytes: Uint8Array; names: string[] }>> {
    const out = await createFields(bytes, fields);
    return new Transferred(out, [out.bytes.buffer as ArrayBuffer]);
  },
};
