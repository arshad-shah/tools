import type { RpcContext } from '@/shared/lib/worker-rpc';
import { generateKeyMaterial } from './generate';
import type { KeySpec } from './spec';

/** The key worker's RPC surface: generation and every export. */
export const keypairHandlers = {
  generate(_ctx: RpcContext, spec: KeySpec) {
    return generateKeyMaterial(spec);
  },
};

export type KeypairHandlers = typeof keypairHandlers;
