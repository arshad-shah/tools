import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { ToolError } from '@/shared/lib/errors';
import { OID } from './cms';
import { tstInfoOf } from './timestamp-token';

/*
 * RFC 3161 timestamp request: the one optional network call of the
 * workspace (owner item 6). It sends only a SHA-256 hash of the signature
 * value and a random nonce, never document bytes, and runs only when the
 * user turned the timestamp on.
 */

export interface TimestampRequestOptions {
  url: string;
  signal: AbortSignal;
}

export const NOT_REACHABLE =
  "Couldn't reach the timestamp server. It may not allow requests from browsers. Try another server or sign without a timestamp.";
export const MISMATCH = 'The timestamp did not match this signature';

const STATUS_TEXT: Record<number, string> = {
  2: 'The timestamp server rejected the request',
  3: 'The timestamp server asked to try again later',
  4: 'The timestamp server reported a revocation warning',
  5: 'The timestamp server reported a revoked certificate',
};

function httpsUrl(url: string): URL {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    throw new ToolError('INVALID_INPUT', 'Enter the timestamp server address');
  }
  if (u.protocol !== 'https:')
    throw new ToolError('INVALID_INPUT', 'Timestamp servers must use https');
  return u;
}

const equal = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Requests a token for `signatureValue`; returns the TimeStampToken (ContentInfo DER). */
export async function requestTimestamp(
  signatureValue: ArrayBuffer,
  o: TimestampRequestOptions,
): Promise<ArrayBuffer> {
  const url = httpsUrl(o.url);
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', signatureValue),
  );
  const nonce = crypto.getRandomValues(new Uint8Array(8));
  nonce[0] &= 0x7f; // a positive INTEGER
  const req = new pkijs.TimeStampReq({
    version: 1,
    messageImprint: new pkijs.MessageImprint({
      hashAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: OID.sha256 }),
      hashedMessage: new asn1js.OctetString({ valueHex: hash }),
    }),
    nonce: new asn1js.Integer({ valueHex: nonce }),
    certReq: true,
  });
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/timestamp-query' },
      body: new Uint8Array(req.toSchema().toBER(false)),
      signal: o.signal,
      credentials: 'omit',
      mode: 'cors',
    });
  } catch (cause) {
    if ((cause as { name?: string })?.name === 'AbortError') throw cause;
    throw new ToolError('NETWORK', NOT_REACHABLE, { cause });
  }
  if (!res.ok)
    throw new ToolError(
      'NETWORK',
      `The timestamp server answered with an error (${res.status})`,
    );
  let resp: pkijs.TimeStampResp;
  try {
    resp = pkijs.TimeStampResp.fromBER(
      ownBuffer(new Uint8Array(await res.arrayBuffer())),
    );
  } catch (cause) {
    throw new ToolError(
      'NETWORK',
      'The timestamp server sent something that is not a timestamp',
      { cause },
    );
  }
  const status = resp.status.status;
  if ((status !== 0 && status !== 1) || !resp.timeStampToken)
    throw new ToolError(
      'NETWORK',
      resp.status.statusStrings?.map((s) => s.valueBlock.value).join(' ') ||
        STATUS_TEXT[status] ||
        'The timestamp server did not grant a timestamp',
    );
  const { info } = tstInfoOf(resp.timeStampToken);
  const imprint = new Uint8Array(
    info.messageImprint.hashedMessage.valueBlock.valueHexView,
  );
  const gotNonce = info.nonce
    ? new Uint8Array(info.nonce.valueBlock.valueHexView)
    : null;
  const sentNonce = new Uint8Array(req.nonce!.valueBlock.valueHexView);
  if (
    info.messageImprint.hashAlgorithm.algorithmId !== OID.sha256 ||
    !equal(imprint, hash) ||
    !gotNonce ||
    !equal(gotNonce, sentNonce)
  )
    throw new ToolError('SIGNATURE_INVALID', MISMATCH);
  return resp.timeStampToken.toSchema().toBER(false);
}
