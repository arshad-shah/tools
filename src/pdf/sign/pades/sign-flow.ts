import { ToolError } from '@/shared/lib/errors';
import { createCms } from './cms';
import type { SigningIdentity } from './pkcs12';
import { DID_NOT_FIT, insertSignature } from './byte-range';
// Types only: sign-pdf (pdf-lib) runs in the edit worker, never here (G4).
import type { PreparedSignature, SignPdfRequest } from './sign-pdf';
import type { SignatureReport } from './verify';

export const NOT_VERIFIED_MESSAGE =
  'The new signature could not be verified, so the file was not saved';

type SignFlowOptions = Parameters<typeof signWithIdentity>[0];

async function signOnce(
  o: SignFlowOptions,
  contentsBytes: number,
): Promise<Uint8Array> {
  const prepared = await o.prepare({ ...o.request, contentsBytes });
  const der = await createCms(prepared.content, o.identity, {
    timestamp: o.timestamp,
  });
  return insertSignature(prepared.file, prepared.range, der);
}

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
  const out = await signOnce(o, o.request.contentsBytes).catch((e) => {
    // A long certificate chain plus a TSA token can outgrow the reserved
    // room: try once more with twice the room (a fresh CMS and timestamp,
    // since the signed bytes change with the placeholder).
    if (!(e instanceof ToolError) || e.message !== DID_NOT_FIT) throw e;
    return signOnce(o, o.request.contentsBytes * 2);
  });
  const reports = await o.verify(out);
  const newest = reports[reports.length - 1];
  if (
    !newest ||
    newest.integrity !== 'intact' ||
    !newest.signatureValid ||
    newest.coverage !== 'whole-document' ||
    newest.signer?.sha256 !== o.identity.info.sha256 ||
    // A requested timestamp must be in the file and match the signature.
    (o.timestamp !== undefined && newest.timestampValid !== true)
  )
    throw new ToolError('SIGNATURE_INVALID', NOT_VERIFIED_MESSAGE);
  return out;
}
