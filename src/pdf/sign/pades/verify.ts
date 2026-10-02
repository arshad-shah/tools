import * as asn1js from 'asn1js';
import { PDFDocument } from 'pdf-lib';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { describeCertificate, type CertInfo } from './cert-info';
import { OID, parseCms } from './cms';
import {
  parsePdfDate,
  readSignatures,
  type StoredSignature,
} from './read-signatures';
import { indexOf } from './syntax';
import { equal, signerCertificate, verifySignedAttrs } from './cms-verify';
import { checkTimestampToken } from './timestamp-token';
import { buildChain, isTimestampAuthority } from './chain';
import { certDer } from './cert-info';
import { sha256 } from '@noble/hashes/sha2.js';

export type Integrity = 'intact' | 'broken';
export type Coverage = 'whole-document' | 'changed-after-signing';
export type TrustStatus =
  | 'trusted'
  | 'self-signed'
  | 'untrusted-issuer'
  | 'invalid-certificate'
  | 'expired-at-signing';

export interface SignatureReport {
  fieldName: string;
  signer: CertInfo | null;
  /** messageDigest equals the digest of the ByteRange content. */
  integrity: Integrity;
  /** The CMS signature over the signed attributes verifies with the signer key. */
  signatureValid: boolean;
  coverage: Coverage;
  /** Later increments not covered by this signature. */
  revisionsAfter: number;
  /**
   * The timestamp's genTime when a token is present, checks out and comes
   * from a trusted TSA (source 'timestamp'); else /M (source 'device-clock').
   */
  time: { value: Date | null; source: 'timestamp' | 'device-clock' };
  /** A token is present and matches this signature (null: no token). */
  timestampValid: boolean | null;
  /** The token's TSA chains to an imported root with the timeStamping EKU. */
  timestampVerified: boolean | null;
  trust: TrustStatus;
  /** Signer first, then each issuer found. */
  chain: CertInfo[];
  /** ETSI.CAdES.detached or adbe.pkcs7.detached (both verified the same way). */
  subFilter: string;
  /** The verdict in plain words. */
  summary: string;
  /** Extra plain-word lines shown under the verdict. */
  notes: string[];
  problems: string[];
}

const HASHES: Record<string, string> = {
  '1.3.14.3.2.26': 'SHA-1',
  [OID.sha256]: 'SHA-256',
  '2.16.840.1.101.3.4.2.2': 'SHA-384',
  '2.16.840.1.101.3.4.2.3': 'SHA-512',
};

const SUPPORTED = new Set(['ETSI.CAdES.detached', 'adbe.pkcs7.detached']);
/** Signatures checked per document (a hostile file could list thousands). */
export const MAX_SIGNATURES = 50;
const HEX_OR_SPACE = /^[0-9a-fA-F\s]*$/;

export const REVOCATION_NOTE = 'Revocation status is not checked.';
export const DEVICE_CLOCK_NOTE =
  'The signing time is stated by the signer and is not verified.';
export const TIMESTAMP_UNVERIFIED_NOTE =
  'Timestamp not verified: the timestamp server is not trusted on this device, so the certificate is checked at the current time.';
export const UNCHECKED_SUMMARY = 'This signature could not be checked.';
export const INVALID_SUMMARY =
  'Invalid. The document or the signature was changed after signing.';

/** The DER of the CMS, without the zero padding after it. */
export function trimDer(contents: Uint8Array): Uint8Array {
  const asn = asn1js.fromBER(ownBuffer(contents));
  return asn.offset > 0 ? contents.subarray(0, asn.offset) : contents;
}

const inValidity = (c: pkijs.Certificate, t: Date) =>
  t.getTime() >= c.notBefore.value.getTime() &&
  t.getTime() <= c.notAfter.value.getTime();

function summaryFor(
  r: Omit<SignatureReport, 'summary' | 'notes'>,
  checkedNow = false,
): {
  summary: string;
  notes: string[];
} {
  const notes: string[] = [];
  if (r.timestampValid && !r.timestampVerified)
    notes.push(TIMESTAMP_UNVERIFIED_NOTE);
  if (r.coverage === 'changed-after-signing')
    notes.push(
      `The document has ${r.revisionsAfter} later ${r.revisionsAfter === 1 ? 'revision' : 'revisions'} not covered by this signature.`,
    );
  if (r.time.source === 'device-clock') notes.push(DEVICE_CLOCK_NOTE);
  notes.push(REVOCATION_NOTE);
  if (r.integrity !== 'intact' || !r.signatureValid)
    return { summary: INVALID_SUMMARY, notes };
  const cn = r.signer?.subjectCN || 'the signer';
  const summary = {
    trusted: `Valid. Signed by ${cn}. The certificate chains to a root you imported.`,
    'self-signed': `Valid signature from a self-signed certificate. Nobody has verified who ${cn} is.`,
    'untrusted-issuer':
      'Valid signature, but the certificate issuer is not trusted on this device.',
    'expired-at-signing': checkedNow
      ? 'Valid signature, but the certificate is not valid now and the signing time is not verified.'
      : 'Valid signature, but the certificate was not valid at the signing time.',
    'invalid-certificate':
      "Valid signature, but the signer's certificate chain does not check out.",
  }[r.trust];
  return { summary, notes };
}

/** Counts "%%EOF" markers after `from` (later incremental updates). */
function countEofAfter(bytes: Uint8Array, from: number): number {
  let n = 0;
  for (
    let i = indexOf(bytes, '%%EOF', from);
    i >= 0;
    i = indexOf(bytes, '%%EOF', i + 5)
  )
    n++;
  return n;
}

async function verifyOne(
  bytes: Uint8Array,
  s: StoredSignature,
  roots: pkijs.Certificate[],
): Promise<SignatureReport> {
  const problems: string[] = [];
  const [a, b, c, d] = s.byteRange;
  const end = c + d;
  const coverage: Coverage =
    a === 0 && end === bytes.length
      ? 'whole-document'
      : 'changed-after-signing';
  const revisionsAfter = end <= bytes.length ? countEofAfter(bytes, end) : 0;
  const deviceTime = parsePdfDate(s.m);
  const base = {
    fieldName: s.fieldName,
    subFilter: s.subFilter,
    coverage,
    revisionsAfter,
    timestampValid: null as boolean | null,
    timestampVerified: null as boolean | null,
    time: { value: deviceTime, source: 'device-clock' as const },
  };
  const fail = (problem: string): SignatureReport => {
    const r = {
      ...base,
      signer: null,
      integrity: 'broken' as const,
      signatureValid: false,
      trust: 'invalid-certificate' as const,
      chain: [],
      timestampVerified: null,
      problems: [...problems, problem],
    };
    return { ...r, summary: UNCHECKED_SUMMARY, notes: [REVOCATION_NOTE] };
  };
  const invalid = (problem: string): SignatureReport => ({
    ...fail(problem),
    summary: INVALID_SUMMARY,
  });
  if (!SUPPORTED.has(s.subFilter))
    return fail(
      `Signatures of type ${s.subFilter || 'unknown'} can't be checked here.`,
    );
  if (a !== 0 || b >= c || end > bytes.length)
    return fail('The signed byte ranges do not fit this file.');
  // The one gap must be exactly the /Contents hex string: anything else
  // left unsigned there (an injected object, say) is signature wrapping.
  const gap = new TextDecoder('latin1').decode(bytes.subarray(b + 1, c - 1));
  if (bytes[b] !== 0x3c || bytes[c - 1] !== 0x3e || !HEX_OR_SPACE.test(gap))
    return invalid(
      'The part of the file left out of the signature is not just the signature value.',
    );
  let signed: pkijs.SignedData;
  try {
    signed = parseCms(trimDer(s.contents));
  } catch {
    return fail('The signature value could not be read.');
  }
  const si = signed.signerInfos[0];
  const cert = si ? signerCertificate(signed, si) : undefined;
  if (!si || !cert)
    return fail("The signer's certificate is missing from the signature.");
  const hash = HASHES[si.digestAlgorithm.algorithmId];
  if (!hash)
    return fail('The signature uses a digest this app does not support.');

  const content = new Uint8Array(b + d);
  content.set(bytes.subarray(0, b), 0);
  content.set(bytes.subarray(c, end), b);
  const digest = new Uint8Array(await crypto.subtle.digest(hash, content));
  const mdAttr = si.signedAttrs?.attributes.find(
    (x) => x.type === OID.messageDigest,
  );
  const md = mdAttr?.values[0] as asn1js.OctetString | undefined;
  const integrity: Integrity =
    md && equal(new Uint8Array(md.valueBlock.valueHexView), digest)
      ? 'intact'
      : 'broken';
  if (integrity === 'broken')
    problems.push(
      'The signed bytes no longer match the digest in the signature.',
    );
  let signatureValid = await verifySignedAttrs(si, cert, hash);
  if (signatureValid && !signingCertificateMatches(si, cert)) {
    signatureValid = false;
    problems.push(
      'The signature names a different certificate than the one it carries.',
    );
  } else if (!signatureValid)
    problems.push(
      "The signature value does not match the signer's certificate.",
    );
  const certAttr = si.signedAttrs?.attributes.find(
    (x) => x.type === OID.signingCertificateV2,
  );
  const certProblem = signingCertificateProblem(certAttr ?? null, s.subFilter);
  if (certProblem) problems.push(certProblem);

  let time: SignatureReport['time'] = base.time;
  let timestampValid: boolean | null = null;
  let timestampVerified: boolean | null = null;
  const tokenAttr = si.unsignedAttrs?.attributes.find(
    (x) => x.type === OID.timeStampToken,
  );
  if (tokenAttr) {
    const ts = await checkTimestampToken(
      tokenAttr.values[0],
      new Uint8Array(si.signature.valueBlock.valueHexView),
    );
    timestampValid = ts !== null;
    timestampVerified = false;
    if (!ts) problems.push('The timestamp does not match this signature.');
    else {
      const tsa = await buildChain(ts.certificate, ts.certificates, roots);
      timestampVerified =
        isTimestampAuthority(ts.certificate) &&
        tsa.linksValid &&
        tsa.anchoredAtImportedRoot &&
        tsa.chain.every((x) => inValidity(x, ts.genTime));
      if (timestampVerified) time = { value: ts.genTime, source: 'timestamp' };
    }
  }

  const pool = (signed.certificates ?? []).filter(
    (x): x is pkijs.Certificate => x instanceof pkijs.Certificate,
  );
  const built = await buildChain(cert, pool, roots);
  // An unverified timestamp proves nothing about when the signature was
  // made, and neither does /M then: judge the certificate at the current time.
  const checkedNow = tokenAttr !== undefined && !timestampVerified;
  const at = checkedNow ? new Date() : (time.value ?? new Date());
  let trust: TrustStatus;
  if (!built.linksValid) trust = 'invalid-certificate';
  else if (!built.chain.every((x) => inValidity(x, at)))
    trust = 'expired-at-signing';
  else if (built.anchoredAtImportedRoot) trust = 'trusted';
  else if (built.selfSigned) trust = 'self-signed';
  else trust = 'untrusted-issuer';
  if (built.problem) problems.push(built.problem);

  const r = {
    ...base,
    signer: describeCertificate(cert),
    integrity,
    signatureValid,
    time,
    timestampValid,
    timestampVerified,
    trust,
    chain: built.chain.map(describeCertificate),
    problems,
  };
  const out = { ...r, ...summaryFor(r, checkedNow) };
  const weak = digestNote(hash);
  if (weak) out.notes.unshift(weak);
  return out;
}

export const SHA1_NOTE =
  'This signature uses SHA-1, which is no longer considered secure.';

/** A note for a digest that is accepted but weak, or null. */
export function digestNote(hash: string): string | null {
  return hash === 'SHA-1' ? SHA1_NOTE : null;
}

export const MORE_NOT_CHECKED = `More signatures were not checked (at most ${MAX_SIGNATURES} are).`;

/** PAdES (ETSI.CAdES.detached) requires signingCertificateV2; adbe.pkcs7 may omit it. */
export function signingCertificateProblem(
  attr: pkijs.Attribute | null,
  subFilter: string,
): string | null {
  return !attr && subFilter === 'ETSI.CAdES.detached'
    ? 'The signature does not name its signing certificate (signingCertificateV2), as PAdES requires.'
    : null;
}

/** signingCertificateV2 (or absent): its certHash must be the signer's SHA-256. */
export function signingCertificateMatches(
  si: pkijs.SignerInfo,
  cert: pkijs.Certificate,
): boolean {
  const attr = si.signedAttrs?.attributes.find(
    (x) => x.type === OID.signingCertificateV2,
  );
  if (!attr) return true;
  try {
    // SigningCertificateV2 ::= SEQUENCE { certs SEQUENCE OF ESSCertIDv2 }
    // ESSCertIDv2 ::= SEQUENCE { hashAlgorithm DEFAULT sha256, certHash, ... }
    const certs = (attr.values[0] as asn1js.Sequence).valueBlock
      .value[0] as asn1js.Sequence;
    const first = certs.valueBlock.value[0] as asn1js.Sequence;
    const parts = first.valueBlock.value;
    const hasAlg = parts[0] instanceof asn1js.Sequence;
    if (hasAlg) {
      const alg = new pkijs.AlgorithmIdentifier({ schema: parts[0] });
      if (alg.algorithmId !== OID.sha256) return true; // other hashes: not checked
    }
    const hash = parts[hasAlg ? 1 : 0] as asn1js.OctetString;
    return equal(
      new Uint8Array(hash.valueBlock.valueHexView),
      sha256(certDer(cert)),
    );
  } catch {
    return false;
  }
}

/**
 * Checks every signed /Sig field: integrity (the ByteRange digest),
 * the signature value, coverage, the timestamp and the certificate chain.
 * Trust is claimed only for chains ending at a root the user imported.
 * Revocation is not checked (the summary says so).
 */
export async function verifyPdfSignatures(
  bytes: Uint8Array,
  opts: { trustedRoots?: pkijs.Certificate[]; maxSignatures?: number } = {},
): Promise<SignatureReport[]> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
  } catch {
    return [];
  }
  const out: SignatureReport[] = [];
  const all = readSignatures(doc);
  const max = opts.maxSignatures ?? MAX_SIGNATURES;
  for (const s of all.slice(0, max))
    out.push(await verifyOne(bytes, s, opts.trustedRoots ?? []));
  if (all.length > max && out.length)
    out[out.length - 1].notes.push(
      max === MAX_SIGNATURES
        ? MORE_NOT_CHECKED
        : `More signatures were not checked (at most ${max} are).`,
    );
  return out;
}
