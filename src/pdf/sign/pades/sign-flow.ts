import { ToolError } from '@/shared/lib/errors';
import { createCms } from './cms';
import type { SigningIdentity } from './pkcs12';
import { insertSignature } from './byte-range';
// Types only: sign-pdf (pdf-lib) runs in the edit worker, never here (G4).
import type { PreparedSignature, SignPdfRequest } from './sign-pdf';
import type { SignatureReport } from './verify';

export const NOT_VERIFIED_MESSAGE =
  'The new signature could not be verified, so the file was not saved';

/**
 * The signing flow (keys stay on the main thread): prepare the increment
 * (edit worker), build the CMS with WebCrypto, write it in, then verify
 * the output. The newest signature must be intact, valid and cover the
 * whole file, or nothing is returned (ToolError model: nothing half-written).
 */
export async function signWithIdentity(o: {
  request: SignPdfRequest;
  identity: SigningIdentity;
  prepare(req: SignPdfRequest): Promise<PreparedSignature>;
  verify(bytes: Uint8Array): Promise<SignatureReport[]>;
  timestamp?: (signatureValue: ArrayBuffer) => Promise<ArrayBuffer>;
}): Promise<Uint8Array> {
  const prepared = await o.prepare(o.request);
  const der = await createCms(prepared.content, o.identity, {
    timestamp: o.timestamp,
  });
  const out = insertSignature(prepared.file, prepared.range, der);
  const reports = await o.verify(out);
  const newest = reports[reports.length - 1];
  if (
    !newest ||
    newest.integrity !== 'intact' ||
    !newest.signatureValid ||
    newest.coverage !== 'whole-document' ||
    newest.signer?.sha256 !== o.identity.info.sha256
  )
    throw new ToolError('SIGNATURE_INVALID', NOT_VERIFIED_MESSAGE);
  return out;
}
