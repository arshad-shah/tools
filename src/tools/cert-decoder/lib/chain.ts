import type * as pkijs from 'pkijs';
import { certSigned, checkSignature, type SignatureCheck } from './verify';

/** How one certificate relates to the next one in the pasted order. */
export interface ChainLink {
  index: number;
  /** The issuer name equals the next certificate's subject. */
  issuerMatchesNext: boolean | null;
  /** The signature checked against the issuer found (next or itself). */
  signature: SignatureCheck | null;
  /** Why the signature was not checked. */
  notChecked: string | null;
  selfSigned: boolean;
}

/**
 * Walks the certificates in the order given (leaf first, as servers send
 * them): each issuer should be the next subject, and its signature is
 * checked with that next certificate's key. The last one is checked
 * against itself when it is self-issued (a root).
 */
export async function analyzeChain(
  certs: pkijs.Certificate[],
): Promise<ChainLink[]> {
  return Promise.all(
    certs.map(async (cert, i): Promise<ChainLink> => {
      const next = certs[i + 1];
      const selfIssued = cert.subject.isEqual(cert.issuer);
      if (next) {
        const matches = cert.issuer.isEqual(next.subject);
        return {
          index: i,
          issuerMatchesNext: matches,
          signature: matches
            ? await checkSignature(certSigned(cert), next.subjectPublicKeyInfo)
            : null,
          notChecked: matches
            ? null
            : "The next certificate is not this one's issuer, so the signature was not checked",
          selfSigned: false,
        };
      }
      if (selfIssued) {
        const signature = await checkSignature(
          certSigned(cert),
          cert.subjectPublicKeyInfo,
        );
        return {
          index: i,
          issuerMatchesNext: null,
          signature,
          notChecked: null,
          selfSigned: signature.state === 'valid',
        };
      }
      return {
        index: i,
        issuerMatchesNext: null,
        signature: null,
        notChecked:
          "The issuer's certificate is not in the input, so the signature was not checked",
        selfSigned: false,
      };
    }),
  );
}
