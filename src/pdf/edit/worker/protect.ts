import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { getMetadata, type PdfMetadata } from '@/pdf/edit/metadata';
import {
  sanitizeDoc,
  type SanitizeOptions,
  type SanitizeReport,
} from '@/pdf/edit/sanitize';

/** Protect mode handlers of the edit worker (plan E-10). */
export const protectHandlers = {
  /** Document properties of the current base (Protect mode form). */
  getMetadata(_ctx: RpcContext, bytes: Uint8Array): Promise<PdfMetadata> {
    return getMetadata(bytes);
  },

  /** The `sanitize` checkpoint, and its dry-run preview. */
  async sanitize(
    _ctx: RpcContext,
    bytes: Uint8Array,
    options: SanitizeOptions & { dryRun?: boolean },
  ): Promise<Transferred<{ bytes: Uint8Array; report: SanitizeReport }>> {
    const r = await sanitizeDoc(bytes, options);
    return new Transferred(r, [r.bytes.buffer as ArrayBuffer]);
  },
};
