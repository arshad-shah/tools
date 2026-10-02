import type { RpcContext } from '@/shared/lib/worker-rpc';

/** Health check: echoes its argument. */
export default {
  ping: (_ctx: RpcContext, s: string) => s,
};
