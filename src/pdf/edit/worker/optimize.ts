import type { RpcContext } from '@/shared/lib/worker-rpc';
import { sizeBreakdown, type SizeBreakdown } from '@/pdf/edit/size-breakdown';

/** Optimize mode handlers of the edit worker (spec 7.2). */
export const optimizeHandlers = {
  /** Bytes per category: images, fonts, page content, the rest. */
  sizeBreakdown(_ctx: RpcContext, bytes: Uint8Array): Promise<SizeBreakdown> {
    return sizeBreakdown(bytes);
  },
};
