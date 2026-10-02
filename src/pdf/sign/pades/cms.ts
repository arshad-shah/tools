import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { certDer } from './cert-info';
import type { SigningIdentity } from './pkcs12';

export const OID = {
  data: '1.2.840.113549.1.7.1',
  signedData: '1.2.840.113549.1.7.2',
  contentType: '1.2.840.113549.1.9.3',
  messageDigest: '1.2.840.113549.1.9.4',
  signingTime: '1.2.840.113549.1.9.5',
  signingCertificateV2: '1.2.840.113549.1.9.16.2.47',
  timeStampToken: '1.2.840.113549.1.9.16.2.14',
  sha256: '2.16.840.1.101.3.4.2.1',
} as const;

/** DER order for SET OF: by encoding, as unsigned bytes. */
function derCompare(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++)
    if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/** Sorts attributes into DER SET OF order, so every verifier hashes the same bytes. */
export function derSorted(attrs: pkijs.Attribute[]): pkijs.Attribute[] {
  return attrs
    .map((a) => ({ a, der: new Uint8Array(a.toSchema().toBER(false)) }))
    .sort((x, y) => derCompare(x.der, y.der))
    .map((x) => x.a);
}

/**
 * contentType = id-data, messageDigest = `digest`, and signingCertificateV2
 * (ESSCertIDv2 with the SHA-256 of the signer's certificate; SHA-256 is the
 * default hash, so it is omitted). No signing-time: PAdES baseline takes
 * the time from /M or a timestamp.
 */
export async function buildSignedAttributes(
  digest: ArrayBuffer,
  cert: pkijs.Certificate,
): Promise<pkijs.Attribute[]> {
  const certHash = await crypto.subtle.digest('SHA-256', certDer(cert));
  const essCertIdV2 = new asn1js.Sequence({
    value: [new asn1js.OctetString({ valueHex: certHash })],
  });
  const signingCertificateV2 = new asn1js.Sequence({
    value: [new asn1js.Sequence({ value: [essCertIdV2] })],
  });
  return derSorted([
    new pkijs.Attribute({
      type: OID.contentType,
      values: [new asn1js.ObjectIdentifier({ value: OID.data })],
    }),
    new pkijs.Attribute({
      type: OID.messageDigest,
      values: [new asn1js.OctetString({ valueHex: digest })],
    }),
    new pkijs.Attribute({
      type: OID.signingCertificateV2,
      values: [signingCertificateV2],
    }),
  ]);
}

/**
 * A detached CMS SignedData (RFC 5652) over `content` for a PAdES-B-B
 * signature: SHA-256 digest, one SignerInfo (v1, IssuerAndSerialNumber),
 * the signer's certificate and chain, and optionally an RFC 3161 timestamp
 * token over the signature value as an unsigned attribute.
 */
export async function createCms(
  content: Uint8Array,
  id: SigningIdentity,
  opts: {
    timestamp?: (signatureValue: ArrayBuffer) => Promise<ArrayBuffer>;
  } = {},
): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', ownBuffer(content));
  const signerInfo = new pkijs.SignerInfo({
    version: 1,
    sid: new pkijs.IssuerAndSerialNumber({
      issuer: id.certificate.issuer,
      serialNumber: id.certificate.serialNumber,
    }),
    signedAttrs: new pkijs.SignedAndUnsignedAttributes({
      type: 0,
      attributes: await buildSignedAttributes(digest, id.certificate),
    }),
  });
  const signed = new pkijs.SignedData({
    version: 1,
    encapContentInfo: new pkijs.EncapsulatedContentInfo({
      eContentType: OID.data,
    }),
    signerInfos: [signerInfo],
    certificates: [id.certificate, ...id.chain],
  });
  await signed.sign(id.privateKey, 0, 'SHA-256');
  if (opts.timestamp) {
    const token = await opts.timestamp(
      ownBuffer(signerInfo.signature.valueBlock.valueHexView).buffer,
    );
    signerInfo.unsignedAttrs = new pkijs.SignedAndUnsignedAttributes({
      type: 1,
      attributes: [
        new pkijs.Attribute({
          type: OID.timeStampToken,
          values: [asn1js.fromBER(token).result],
        }),
      ],
    });
  }
  const info = new pkijs.ContentInfo({
    contentType: OID.signedData,
    content: signed.toSchema(true),
  });
  return new Uint8Array(info.toSchema().toBER(false));
}

/** Parses a CMS ContentInfo with SignedData; trailing zero padding is ignored. */
export function parseCms(der: Uint8Array): pkijs.SignedData {
  const asn = asn1js.fromBER(ownBuffer(der));
  if (asn.offset === -1) throw new Error('The signature value is not DER');
  const info = new pkijs.ContentInfo({ schema: asn.result });
  if (info.contentType !== OID.signedData)
    throw new Error('The signature value is not CMS SignedData');
  return new pkijs.SignedData({ schema: info.content });
}
