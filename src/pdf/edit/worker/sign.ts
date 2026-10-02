import * as pkijs from 'pkijs';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import {
  prepareSignature,
  type PreparedSignature,
  type SignPdfRequest,
} from '@/pdf/sign/pades/sign-pdf';
import {
  appendSummaryPage,
  type SummaryPageInput,
} from '@/pdf/sign/pades/summary-page';
import {
  verifyPdfSignatures,
  type SignatureReport,
} from '@/pdf/sign/pades/verify';

/**
 * Digital-signature handlers of the edit worker (plan H-11). No key
 * material crosses into the worker: it prepares the byte ranges and
 * verifies; the CMS is built on the main thread.
 */
export const signHandlers = {
  async prepareSignature(
    _ctx: RpcContext,
    req: SignPdfRequest,
  ): Promise<Transferred<PreparedSignature>> {
    const out = await prepareSignature(req);
    return new Transferred(out, [
      out.file.buffer as ArrayBuffer,
      out.content.buffer as ArrayBuffer,
    ]);
  },

  /** Every signature in `bytes`; `roots` are imported trusted roots (DER). */
  verifySignatures(
    _ctx: RpcContext,
    bytes: Uint8Array,
    roots: Uint8Array[],
  ): Promise<SignatureReport[]> {
    const trustedRoots = roots.map((d) =>
      pkijs.Certificate.fromBER(d.slice().buffer),
    );
    return verifyPdfSignatures(bytes, { trustedRoots });
  },

  async appendSummaryPage(
    _ctx: RpcContext,
    bytes: Uint8Array,
    input: SummaryPageInput,
  ): Promise<Transferred<Uint8Array>> {
    const out = await appendSummaryPage(bytes, input);
    return new Transferred(out, [out.buffer as ArrayBuffer]);
  },
};
