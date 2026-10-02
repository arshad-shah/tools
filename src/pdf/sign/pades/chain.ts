import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { describeCertificate, sameName } from './cert-info';

/*
 * Certificate path building for verification (RFC 5280 §6, the parts that
 * matter offline): every issuer must be a CA (basicConstraints cA) that may
 * sign certificates (keyUsage keyCertSign when keyUsage is present), within
 * its pathLenConstraint, and every link's signature must verify. Trust is
 * only ever claimed for a path that ends at a root the user imported.
 */

export interface ChainResult {
  /** Signer first, then each issuer found. */
  chain: pkijs.Certificate[];
  /** Every link verifies and every issuer may issue. */
  linksValid: boolean;
  /** Why a link failed, in plain words. */
  problem: string | null;
  anchoredAtImportedRoot: boolean;
  /** A lone self-signed certificate whose own signature verifies. */
  selfSigned: boolean;
}

const BASIC_CONSTRAINTS = '2.5.29.19';
const KEY_USAGE = '2.5.29.15';
const EXT_KEY_USAGE = '2.5.29.37';
export const TIME_STAMPING = '1.3.6.1.5.5.7.3.8';
const MAX_DEPTH = 10;

const extension = (c: pkijs.Certificate, id: string) =>
  c.extensions?.find((e) => e.extnID === id);

/** keyUsage bit n (0 = digitalSignature, 5 = keyCertSign), or null when absent. */
function keyUsageBit(c: pkijs.Certificate, bit: number): boolean | null {
  const e = extension(c, KEY_USAGE);
  if (!e) return null;
  const bits = e.parsedValue as asn1js.BitString | undefined;
  const bytes = bits?.valueBlock.valueHexView;
  if (!bytes) return false;
  const byte = bytes[bit >> 3] ?? 0;
  return (byte & (0x80 >> (bit & 7))) !== 0;
}

/** Why `issuer` may not issue a certificate `below` CA levels down, or null. */
function issuerProblem(
  issuer: pkijs.Certificate,
  below: number,
): string | null {
  const bc = extension(issuer, BASIC_CONSTRAINTS)?.parsedValue as
    | pkijs.BasicConstraints
    | undefined;
  const cn = describeCertificate(issuer).subjectCN || 'An issuer';
  if (!bc?.cA)
    return `${cn} is not a certificate authority, so it cannot issue certificates.`;
  if (keyUsageBit(issuer, 5) === false)
    return `${cn} is not allowed to sign certificates.`;
  const len = bc.pathLenConstraint;
  const max =
    typeof len === 'number'
      ? len
      : len instanceof asn1js.Integer
        ? len.valueBlock.valueDec
        : null;
  if (max !== null && below > max)
    return `${cn} allows ${max} intermediate certificates below it, not ${below}.`;
  return null;
}

/** True when the certificate has the critical id-kp-timeStamping EKU only use (RFC 3161 §2.3). */
export function isTimestampAuthority(c: pkijs.Certificate): boolean {
  const e = extension(c, EXT_KEY_USAGE);
  const eku = e?.parsedValue as pkijs.ExtKeyUsage | undefined;
  return !!e?.critical && !!eku?.keyPurposes.includes(TIME_STAMPING);
}

export async function buildChain(
  signer: pkijs.Certificate,
  pool: pkijs.Certificate[],
  roots: pkijs.Certificate[],
): Promise<ChainResult> {
  const rootHashes = new Set(roots.map((r) => describeCertificate(r).sha256));
  const chain = [signer];
  const result = (
    o: Partial<Omit<ChainResult, 'chain'>> = {},
  ): ChainResult => ({
    chain,
    linksValid: o.linksValid ?? true,
    problem: o.problem ?? null,
    anchoredAtImportedRoot: o.anchoredAtImportedRoot ?? false,
    selfSigned: o.selfSigned ?? false,
  });
  let cur = signer;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (rootHashes.has(describeCertificate(cur).sha256))
      return result({ anchoredAtImportedRoot: true });
    if (sameName(cur.issuer, cur.subject)) {
      const ok = await cur.verify().catch(() => false);
      return ok
        ? result({ selfSigned: chain.length === 1 })
        : result({
            linksValid: false,
            problem: 'A certificate is not signed by its own key.',
          });
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
    if (!issuer)
      return candidates.length
        ? result({
            linksValid: false,
            problem: 'A certificate in the chain is not signed by its issuer.',
          })
        : result();
    // CA certificates between the signer and this issuer (RFC 5280 §6.1.4).
    const problem = issuerProblem(issuer, chain.length - 1);
    chain.push(issuer);
    if (problem) return result({ linksValid: false, problem });
    cur = issuer;
  }
  return result({
    linksValid: false,
    problem: 'The certificate chain is too long.',
  });
}
