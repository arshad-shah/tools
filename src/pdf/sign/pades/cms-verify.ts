import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { sameName } from './cert-info';

export const equal = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** The certificate a SignerInfo names, from the SignedData's certificates. */
export function signerCertificate(
  signed: pkijs.SignedData,
  si: pkijs.SignerInfo,
) {
  const certs = (signed.certificates ?? []).filter(
    (c): c is pkijs.Certificate => c instanceof pkijs.Certificate,
  );
  if (si.sid instanceof pkijs.IssuerAndSerialNumber) {
    const sid = si.sid;
    return certs.find(
      (c) =>
        sameName(c.issuer, sid.issuer) &&
        c.serialNumber.isEqual(sid.serialNumber),
    );
  }
  // SubjectKeyIdentifier: match the certificate's SKI extension.
  const ski = new Uint8Array(
    (si.sid as asn1js.OctetString).valueBlock.valueHexView,
  );
  return certs.find((c) => {
    const e = c.extensions?.find((x) => x.extnID === '2.5.29.14');
    const v = e?.parsedValue as asn1js.OctetString | undefined;
    return v ? equal(new Uint8Array(v.valueBlock.valueHexView), ski) : false;
  });
}

export async function verifySignedAttrs(
  si: pkijs.SignerInfo,
  cert: pkijs.Certificate,
  hash: string,
): Promise<boolean> {
  if (!si.signedAttrs) return false;
  const data = si.signedAttrs.encodedValue.byteLength
    ? new Uint8Array(si.signedAttrs.encodedValue).slice()
    : new Uint8Array(si.signedAttrs.toSchema().toBER(false));
  data[0] = 0x31; // signed over as SET OF, not [0] IMPLICIT
  try {
    return await pkijs
      .getCrypto(true)
      .verifyWithPublicKey(
        data.buffer,
        si.signature,
        cert.subjectPublicKeyInfo,
        si.signatureAlgorithm,
        hash,
      );
  } catch {
    return false;
  }
}
