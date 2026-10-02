import { sha256 } from '@noble/hashes/sha2.js';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { toHex } from './syntax';

/** A certificate in plain terms, for the UI and the verifier. */
export interface CertInfo {
  subjectCN: string;
  subject: string;
  issuerCN: string;
  issuer: string;
  serialHex: string;
  notBefore: Date;
  notAfter: Date;
  selfSigned: boolean;
  keyDescription: string;
  /** SHA-256 of the DER certificate, lower-case hex. */
  sha256: string;
}

const ATTR_NAMES: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '1.2.840.113549.1.9.1': 'E',
};

const CURVES: Record<string, string> = {
  '1.2.840.10045.3.1.7': 'P-256',
  '1.3.132.0.34': 'P-384',
  '1.3.132.0.35': 'P-521',
};

const valueText = (v: unknown): string => {
  const block = (v as { valueBlock?: { value?: unknown } }).valueBlock;
  return typeof block?.value === 'string' ? block.value : '';
};

export function nameAttr(name: pkijs.RelativeDistinguishedNames, oid: string) {
  const tv = name.typesAndValues.find((t) => t.type === oid);
  return tv ? valueText(tv.value) : '';
}

/** "CN=Jane Doe, O=Example" in the certificate's order. */
export function nameText(name: pkijs.RelativeDistinguishedNames): string {
  return name.typesAndValues
    .map((t) => `${ATTR_NAMES[t.type] ?? t.type}=${valueText(t.value)}`)
    .join(', ');
}

export const sameName = (
  a: pkijs.RelativeDistinguishedNames,
  b: pkijs.RelativeDistinguishedNames,
) => a.isEqual(b);

export const certDer = (c: pkijs.Certificate) =>
  new Uint8Array(c.toSchema(true).toBER(false));

/** SHA-256 of the DER certificate (lower-case hex). */
export const certSha256 = (c: pkijs.Certificate): string =>
  toHex(sha256(certDer(c)));

function keyDescription(c: pkijs.Certificate): string {
  const spki = c.subjectPublicKeyInfo;
  const alg = spki.algorithm.algorithmId;
  if (alg === '1.2.840.113549.1.1.1') {
    try {
      const rsa = pkijs.RSAPublicKey.fromBER(
        ownBuffer(spki.subjectPublicKey.valueBlock.valueHexView),
      );
      const bytes = rsa.modulus.valueBlock.valueHexView;
      const bits = (bytes[0] === 0 ? bytes.length - 1 : bytes.length) * 8;
      return `RSA ${bits}`;
    } catch {
      return 'RSA';
    }
  }
  if (alg === '1.2.840.10045.2.1') {
    const params = spki.algorithm.algorithmParams;
    const curve =
      params instanceof asn1js.ObjectIdentifier
        ? CURVES[params.valueBlock.toString()]
        : undefined;
    return curve ? `ECDSA ${curve}` : 'ECDSA';
  }
  return alg;
}

/** Plain facts about a certificate; selfSigned means issuer equals subject. */
export function describeCertificate(cert: pkijs.Certificate): CertInfo {
  return {
    subjectCN: nameAttr(cert.subject, '2.5.4.3'),
    subject: nameText(cert.subject),
    issuerCN: nameAttr(cert.issuer, '2.5.4.3'),
    issuer: nameText(cert.issuer),
    serialHex: toHex(cert.serialNumber.valueBlock.valueHexView),
    notBefore: cert.notBefore.value,
    notAfter: cert.notAfter.value,
    selfSigned: sameName(cert.subject, cert.issuer),
    keyDescription: keyDescription(cert),
    sha256: certSha256(cert),
  };
}

/** Parses a DER or PEM certificate. */
export function parseCertificate(bytes: Uint8Array): pkijs.Certificate {
  const text = new TextDecoder('latin1').decode(bytes);
  const pem =
    /-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/.exec(text);
  const der = pem
    ? Uint8Array.from(atob(pem[1].replace(/\s+/g, '')), (c) => c.charCodeAt(0))
    : bytes;
  return pkijs.Certificate.fromBER(ownBuffer(der));
}
