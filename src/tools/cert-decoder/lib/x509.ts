import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { ToolError } from '@/shared/lib/errors';
import { readExtensions, type ExtensionsView } from './extensions';
import { describeSpki, type KeyInfo } from './keys';
import { attr, hex, nameAttrs, nameText, type NameAttr } from './names';
import { named, SIGNATURE_ALGS } from './oids';

export interface CertView {
  version: number;
  serial: string;
  subject: NameAttr[];
  subjectText: string;
  issuer: NameAttr[];
  issuerText: string;
  /** Common name, or the first attribute, for titles. */
  title: string;
  notBefore: Date;
  notAfter: Date;
  signatureAlgorithm: string;
  key: KeyInfo;
  ext: ExtensionsView;
  selfIssued: boolean;
}

export type Validity =
  | { state: 'valid'; daysLeft: number }
  | { state: 'expiring'; daysLeft: number }
  | { state: 'expired'; daysAgo: number }
  | { state: 'not-yet-valid'; daysUntil: number };

const DAY = 86_400_000;
/** Warn this many days before expiry. */
export const EXPIRY_WARNING_DAYS = 30;

export function validity(
  c: { notBefore: Date; notAfter: Date },
  now: number,
): Validity {
  if (now < c.notBefore.getTime())
    return {
      state: 'not-yet-valid',
      daysUntil: Math.ceil((c.notBefore.getTime() - now) / DAY),
    };
  if (now > c.notAfter.getTime())
    return {
      state: 'expired',
      daysAgo: Math.floor((now - c.notAfter.getTime()) / DAY),
    };
  const daysLeft = Math.floor((c.notAfter.getTime() - now) / DAY);
  return daysLeft < EXPIRY_WARNING_DAYS
    ? { state: 'expiring', daysLeft }
    : { state: 'valid', daysLeft };
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/** The validity in words: "Expires in 89 days", "Expired 3 days ago". */
export function validityText(v: Validity): string {
  switch (v.state) {
    case 'valid':
    case 'expiring':
      return v.daysLeft === 0
        ? 'Expires today'
        : `Expires in ${days(v.daysLeft)}`;
    case 'expired':
      return v.daysAgo === 0
        ? 'Expired today'
        : `Expired ${days(v.daysAgo)} ago`;
    case 'not-yet-valid':
      return `Not valid for another ${days(v.daysUntil)}`;
  }
}

export function parseCertificateDer(der: Uint8Array): pkijs.Certificate {
  try {
    return pkijs.Certificate.fromBER(ownBuffer(der));
  } catch (cause) {
    throw new ToolError(
      'CERTIFICATE_INVALID',
      'This block is not a valid X.509 certificate',
      {
        cause,
      },
    );
  }
}

const titleOf = (subject: NameAttr[], fallback: string) =>
  attr(subject, 'CN') || subject[0]?.value || fallback;

/** A certificate in plain terms (no network, no trust decisions). */
export function describeCertificate(cert: pkijs.Certificate): CertView {
  const subject = nameAttrs(cert.subject);
  const issuer = nameAttrs(cert.issuer);
  const ext = readExtensions(cert.extensions);
  return {
    version: cert.version + 1,
    serial: hex(cert.serialNumber.valueBlock.valueHexView, ':'),
    subject,
    subjectText: nameText(subject),
    issuer,
    issuerText: nameText(issuer),
    title: titleOf(subject, ext.sans[0]?.value ?? 'Certificate'),
    notBefore: cert.notBefore.value,
    notAfter: cert.notAfter.value,
    signatureAlgorithm: named(
      SIGNATURE_ALGS,
      cert.signatureAlgorithm.algorithmId,
    ),
    key: describeSpki(cert.subjectPublicKeyInfo),
    ext,
    selfIssued: cert.subject.isEqual(cert.issuer),
  };
}

export interface Fingerprints {
  sha1: string;
  sha256: string;
}

/** SHA-1 and SHA-256 of the DER bytes, upper-case hex with colons. */
export async function fingerprints(der: Uint8Array): Promise<Fingerprints> {
  const buf = ownBuffer(der);
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-1', buf),
    crypto.subtle.digest('SHA-256', buf),
  ]);
  return {
    sha1: hex(new Uint8Array(a), ':').toUpperCase(),
    sha256: hex(new Uint8Array(b), ':').toUpperCase(),
  };
}
