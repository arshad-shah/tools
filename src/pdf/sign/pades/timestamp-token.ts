import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { equal, signerCertificate, verifySignedAttrs } from './cms-verify';

const HASHES: Record<string, string> = {
  '1.3.14.3.2.26': 'SHA-1',
  '2.16.840.1.101.3.4.2.1': 'SHA-256',
  '2.16.840.1.101.3.4.2.2': 'SHA-384',
  '2.16.840.1.101.3.4.2.3': 'SHA-512',
};
const MESSAGE_DIGEST = '1.2.840.113549.1.9.4';

/** The TSTInfo inside an RFC 3161 TimeStampToken (a CMS SignedData). */
export function tstInfoOf(token: pkijs.ContentInfo): {
  signed: pkijs.SignedData;
  info: pkijs.TSTInfo;
  der: Uint8Array;
} {
  const signed = new pkijs.SignedData({ schema: token.content });
  const e = signed.encapContentInfo.eContent;
  if (!e) throw new Error('The timestamp has no content');
  const der = new Uint8Array(e.getValue());
  return { signed, info: pkijs.TSTInfo.fromBER(ownBuffer(der)), der };
}

const digest = async (hash: string, data: Uint8Array) =>
  new Uint8Array(await crypto.subtle.digest(hash, ownBuffer(data)));

export interface CheckedToken {
  genTime: Date;
  /** The TSA's certificate (the token's signer). */
  certificate: pkijs.Certificate;
  /** Every certificate the token carries (for the TSA's chain). */
  certificates: pkijs.Certificate[];
}

/**
 * Checks a timestamp token over `signatureValue`: its message imprint, the
 * digest of its TSTInfo and the TSA's signature. Returns the claimed time
 * and the TSA's certificate, or null when it does not check out. Whether
 * the TSA is trusted (chain to an imported root, timeStamping EKU) is the
 * verifier's decision: until then genTime is only a claim.
 */
export async function checkTimestampToken(
  value: unknown,
  signatureValue: Uint8Array,
): Promise<CheckedToken | null> {
  try {
    const token = new pkijs.ContentInfo({ schema: value as asn1js.Sequence });
    const { signed, info, der } = tstInfoOf(token);
    const imprintHash = HASHES[info.messageImprint.hashAlgorithm.algorithmId];
    if (!imprintHash) return null;
    const expected = new Uint8Array(
      info.messageImprint.hashedMessage.valueBlock.valueHexView,
    );
    if (!equal(await digest(imprintHash, signatureValue), expected))
      return null;
    const si = signed.signerInfos[0];
    const cert = si && signerCertificate(signed, si);
    const hash = si && HASHES[si.digestAlgorithm.algorithmId];
    if (!si || !cert || !hash) return null;
    const md = si.signedAttrs?.attributes.find((a) => a.type === MESSAGE_DIGEST)
      ?.values[0] as asn1js.OctetString | undefined;
    if (
      !md ||
      !equal(
        new Uint8Array(md.valueBlock.valueHexView),
        await digest(hash, der),
      )
    )
      return null;
    if (!(await verifySignedAttrs(si, cert, hash))) return null;
    return {
      genTime: info.genTime,
      certificate: cert,
      certificates: (signed.certificates ?? []).filter(
        (c): c is pkijs.Certificate => c instanceof pkijs.Certificate,
      ),
    };
  } catch {
    return null;
  }
}
