import {
  decrypt,
  encrypt,
  inspect,
  optimize,
  type EncryptOptions,
  type OptimizeOptions,
} from '@arshad-shah/qpdf-wasm';
import { ownBuffer } from '@/shared/lib/bytes';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { qpdfToToolError } from './errors';

export interface PdfInspection {
  encrypted: boolean;
  needsPassword: boolean;
  pdfVersion: string;
  pageCount: number | null;
  warnings: string[];
}

export interface QpdfPdfResult {
  bytes: Uint8Array;
  warnings: string[];
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw qpdfToToolError(e);
  }
}

function out(r: {
  bytes: Uint8Array;
  warnings: string[];
}): Transferred<QpdfPdfResult> {
  const bytes = ownBuffer(r.bytes);
  return new Transferred({ bytes, warnings: r.warnings }, [bytes.buffer]);
}

// qpdf calls are synchronous wasm: an abort cannot interrupt one, but the RPC
// client rejects with CANCELLED immediately and drops the late result.
export const qpdfHandlers = {
  inspect: (
    _ctx: RpcContext,
    bytes: Uint8Array,
    password?: string,
  ): Promise<PdfInspection> =>
    guard(async () => {
      const r = await inspect(bytes, password);
      return {
        encrypted: r.encrypted,
        needsPassword: r.needsPassword,
        pdfVersion: r.pdfVersion,
        pageCount: r.pageCount,
        warnings: r.warnings,
      };
    }),
  optimize: (_ctx: RpcContext, bytes: Uint8Array, options: OptimizeOptions) =>
    guard(async () => out(await optimize(bytes, options))),
  encrypt: (_ctx: RpcContext, bytes: Uint8Array, options: EncryptOptions) =>
    guard(async () => out(await encrypt(bytes, options))),
  decrypt: (_ctx: RpcContext, bytes: Uint8Array, password: string) =>
    guard(async () => out(await decrypt(bytes, password))),
};

export type QpdfHandlers = typeof qpdfHandlers;
