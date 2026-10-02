import * as asn1js from 'asn1js';
import { PDFDocument } from 'pdf-lib';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { describeCertificate, sameName, type CertInfo } from './cert-info';
import { OID, parseCms } from './cms';
import {
  parsePdfDate,
  readSignatures,
  type StoredSignature,
} from './read-signatures';
import { indexOf } from './syntax';
import { equal, signerCertificate, verifySignedAttrs } from './cms-verify';
import { checkTimestampToken } from './timestamp-token';

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
  /** The timestamp's genTime when a token is present and verifies, else /M. */
  time: { value: Date | null; source: 'timestamp' | 'device-clock' };
  timestampValid: boolean | null;
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

export const REVOCATION_NOTE = 'Revocation status is not checked.';
export const DEVICE_CLOCK_NOTE =
  "Signing time comes from the signer's device clock and is not verified.";
export const UNCHECKED_SUMMARY = 'This signature could not be checked.';
export const INVALID_SUMMARY =
  'Invalid. The document or the signature was changed after signing.';

/** The DER of the CMS, without the zero padding after it. */
export function trimDer(contents: Uint8Array): Uint8Array {
  const asn = asn1js.fromBER(ownBuffer(contents));
  return asn.offset > 0 ? contents.subarray(0, asn.offset) : contents;
}

interface ChainResult {
  chain: pkijs.Certificate[];
  linksValid: boolean;
  anchoredAtImportedRoot: boolean;
  selfSigned: boolean;
}

async function buildChain(
  signer: pkijs.Certificate,
  pool: pkijs.Certificate[],
  roots: pkijs.Certificate[],
): Promise<ChainResult> {
  const rootHashes = new Set(roots.map((r) => describeCertificate(r).sha256));
  const chain = [signer];
  let linksValid = true;
  let cur = signer;
  for (let depth = 0; depth < 10; depth++) {
    if (rootHashes.has(describeCertificate(cur).sha256))
      return {
        chain,
        linksValid,
        anchoredAtImportedRoot: linksValid,
        selfSigned: false,
      };
    if (sameName(cur.issuer, cur.subject)) {
      const ok = await cur.verify().catch(() => false);
      return {
        chain,
        linksValid: linksValid && ok,
        anchoredAtImportedRoot: false,
        selfSigned: ok && chain.length === 1,
      };
    }
    const candidates = [...roots, ...pool].filter(
      (c) => sameName(c.subject, cur.issuer) && !chain.includes(c),
    );
    let issuer: pkijs.Certificate | undefined;
    for (const c of candidates)
      if (await cur.verify(c).catch(() => false)) {
        issuer = c;
        break;
      }
    if (!issuer) {
      if (candidates.length) linksValid = false;
      return {
        chain,
        linksValid,
        anchoredAtImportedRoot: false,
        selfSigned: false,
      };
    }
    chain.push(issuer);
    cur = issuer;
  }
  return {
    chain,
    linksValid,
    anchoredAtImportedRoot: false,
    selfSigned: false,
  };
}

const inValidity = (c: pkijs.Certificate, t: Date) =>
  t.getTime() >= c.notBefore.value.getTime() &&
  t.getTime() <= c.notAfter.value.getTime();

function summaryFor(r: Omit<SignatureReport, 'summary' | 'notes'>): {
  summary: string;
  notes: string[];
} {
  const notes: string[] = [];
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
    'expired-at-signing':
      'Valid signature, but the certificate was not valid at the signing time.',
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
      problems: [...problems, problem],
    };
    return { ...r, summary: UNCHECKED_SUMMARY, notes: [REVOCATION_NOTE] };
  };
  if (!SUPPORTED.has(s.subFilter))
    return fail(
      `Signatures of type ${s.subFilter || 'unknown'} can't be checked here.`,
    );
  if (a !== 0 || b > c || end > bytes.length)
    return fail('The signed byte ranges do not fit this file.');
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
  const signatureValid = await verifySignedAttrs(si, cert, hash);
  if (!signatureValid)
    problems.push(
      "The signature value does not match the signer's certificate.",
    );

  let time: SignatureReport['time'] = base.time;
  let timestampValid: boolean | null = null;
  const tokenAttr = si.unsignedAttrs?.attributes.find(
    (x) => x.type === OID.timeStampToken,
  );
  if (tokenAttr) {
    const ts = await checkTimestampToken(
      tokenAttr.values[0],
      new Uint8Array(si.signature.valueBlock.valueHexView),
    );
    timestampValid = ts !== null;
    if (ts) time = { value: ts, source: 'timestamp' };
    else problems.push('The timestamp does not match this signature.');
  }

  const pool = (signed.certificates ?? []).filter(
    (x): x is pkijs.Certificate => x instanceof pkijs.Certificate,
  );
  const built = await buildChain(cert, pool, roots);
  const at = time.value ?? new Date();
  let trust: TrustStatus;
  if (!built.linksValid) trust = 'invalid-certificate';
  else if (!built.chain.every((x) => inValidity(x, at)))
    trust = 'expired-at-signing';
  else if (built.anchoredAtImportedRoot) trust = 'trusted';
  else if (built.selfSigned) trust = 'self-signed';
  else trust = 'untrusted-issuer';
  if (trust === 'invalid-certificate')
    problems.push('A certificate in the chain is not signed by its issuer.');

  const r = {
    ...base,
    signer: describeCertificate(cert),
    integrity,
    signatureValid,
    time,
    timestampValid,
    trust,
    chain: built.chain.map(describeCertificate),
    problems,
  };
  return { ...r, ...summaryFor(r) };
}

/**
 * Checks every signed /Sig field: integrity (the ByteRange digest),
 * the signature value, coverage, the timestamp and the certificate chain.
 * Trust is claimed only for chains ending at a root the user imported.
 * Revocation is not checked (the summary says so).
 */
export async function verifyPdfSignatures(
  bytes: Uint8Array,
  opts: { trustedRoots?: pkijs.Certificate[] } = {},
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
  for (const s of readSignatures(doc))
    out.push(await verifyOne(bytes, s, opts.trustedRoots ?? []));
  return out;
}
