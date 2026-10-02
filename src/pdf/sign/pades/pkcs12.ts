import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { ToolError } from '@/shared/lib/errors';
import { describeCertificate, type CertInfo } from './cert-info';

/**
 * A key that can sign, with its certificate. Lives in memory for one Export
 * dialog session only: never logged, stored or put in the op log (G25).
 */
export interface SigningIdentity {
  /** Non-extractable, usage ['sign']. */
  privateKey: CryptoKey;
  algorithm: SigningAlgorithm;
  /** The signer. */
  certificate: pkijs.Certificate;
  /** Other certificates from the file (may be empty). */
  chain: pkijs.Certificate[];
  info: CertInfo;
}

export type SigningAlgorithm =
  | { name: 'RSASSA-PKCS1-v1_5'; hash: 'SHA-256' }
  | {
      name: 'ECDSA';
      namedCurve: 'P-256' | 'P-384';
      hash: 'SHA-256' | 'SHA-384';
    };

const OID = {
  keyBag: '1.2.840.113549.1.12.10.1.1',
  shroudedKeyBag: '1.2.840.113549.1.12.10.1.2',
  certBag: '1.2.840.113549.1.12.10.1.3',
  localKeyId: '1.2.840.113549.1.9.21',
  encryptedData: '1.2.840.113549.1.7.6',
  rsa: '1.2.840.113549.1.1.1',
  ec: '1.2.840.10045.2.1',
  p256: '1.2.840.10045.3.1.7',
  p384: '1.3.132.0.34',
} as const;

/** PKCS#12 PBE schemes (3DES, RC2) browsers can't decrypt (G13). */
const LEGACY_PBE = /^1\.2\.840\.113549\.1\.12\.1\.\d$/;

const invalid = (message: string, cause?: unknown) =>
  new ToolError('CERTIFICATE_INVALID', message, { cause });

export const WRONG_PASSWORD = 'The certificate password is wrong';
export const LEGACY_MESSAGE =
  'This certificate file uses old encryption (3DES or RC2) that browsers cannot open. Export it again with AES-256 (for example: openssl pkcs12 -export -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256).';
export const NO_KEY_MESSAGE = 'This file has no private key, so it cannot sign';
export const KEY_TYPE_MESSAGE =
  'Only RSA and ECDSA (P-256, P-384) keys can sign here';

/** The WebCrypto algorithm for a PKCS#8 key, or null when it can't sign here. */
export function signingAlgorithm(
  key: pkijs.PrivateKeyInfo,
): SigningAlgorithm | null {
  const id = key.privateKeyAlgorithm.algorithmId;
  if (id === OID.rsa) return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  if (id !== OID.ec) return null;
  const p = key.privateKeyAlgorithm.algorithmParams;
  const curve =
    p instanceof asn1js.ObjectIdentifier ? p.valueBlock.toString() : '';
  if (curve === OID.p256)
    return { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' };
  if (curve === OID.p384)
    return { name: 'ECDSA', namedCurve: 'P-384', hash: 'SHA-384' };
  return null;
}

const importParams = (a: SigningAlgorithm) =>
  a.name === 'ECDSA' ? { name: 'ECDSA', namedCurve: a.namedCurve } : a;

/** Imports a PKCS#8 key as a non-extractable signing key; `der` is zero-filled after. */
export async function importSigningKey(
  der: Uint8Array,
  algorithm: SigningAlgorithm,
): Promise<CryptoKey> {
  const own = ownBuffer(der);
  try {
    return await crypto.subtle.importKey(
      'pkcs8',
      own,
      importParams(algorithm),
      false,
      ['sign'],
    );
  } catch (cause) {
    throw invalid(KEY_TYPE_MESSAGE, cause);
  } finally {
    own.fill(0);
    der.fill(0);
  }
}

const localKeyId = (bag: pkijs.SafeBag) => {
  const attr = bag.bagAttributes?.find((a) => a.type === OID.localKeyId);
  const v = attr?.values[0];
  return v instanceof asn1js.OctetString
    ? Array.from(v.valueBlock.valueHexView).join(',')
    : null;
};

const isCa = (c: pkijs.Certificate) =>
  c.extensions?.some(
    (e) =>
      e.extnID === '2.5.29.19' &&
      (e.parsedValue as pkijs.BasicConstraints | undefined)?.cA === true,
  ) ?? false;

const legacy = (algorithmId: string) => LEGACY_PBE.test(algorithmId);

/** Whether the file's encrypted contents use 3DES/RC2 (read from a fresh parse). */
function usesLegacyPbe(bytes: Uint8Array): boolean {
  let safe: pkijs.AuthenticatedSafe;
  try {
    const pfx = pkijs.PFX.fromBER(bytes.slice().buffer);
    safe = pkijs.AuthenticatedSafe.fromBER(
      (pfx.authSafe.content as asn1js.OctetString).getValue(),
    );
  } catch {
    return false;
  }
  return safe.safeContents.some((ci) => {
    if (ci.contentType !== OID.encryptedData) return false;
    try {
      const enc = new pkijs.EncryptedData({ schema: ci.content });
      return legacy(
        enc.encryptedContentInfo.contentEncryptionAlgorithm.algorithmId,
      );
    } catch {
      return false;
    }
  });
}

/**
 * Opens a .p12/.pfx with its password over WebCrypto (PBES2 only, G13).
 * The password bytes are zero-filled before returning.
 */
export async function importPkcs12(
  bytes: Uint8Array,
  password: string,
): Promise<SigningIdentity> {
  const pw = new TextEncoder().encode(password);
  const pwBuf = pw.buffer as ArrayBuffer;
  try {
    let pfx: pkijs.PFX;
    try {
      pfx = pkijs.PFX.fromBER(ownBuffer(bytes));
    } catch (cause) {
      throw invalid('This is not a certificate file (.p12 or .pfx)', cause);
    }
    try {
      await pfx.parseInternalValues({ password: pwBuf, checkIntegrity: true });
    } catch (cause) {
      throw invalid(WRONG_PASSWORD, cause);
    }
    const safe = pfx.parsedValue!.authenticatedSafe!;
    try {
      await safe.parseInternalValues({
        safeContents: safe.safeContents.map(() => ({ password: pwBuf })),
      });
    } catch (cause) {
      // Checked on a fresh parse: building an EncryptedData from pkijs's
      // objects changes them, so its own parse of them fails afterwards.
      throw invalid(
        usesLegacyPbe(bytes) ? LEGACY_MESSAGE : WRONG_PASSWORD,
        cause,
      );
    }
    const bags = safe.parsedValue!.safeContents.flatMap(
      (s: { value: pkijs.SafeContents }) => s.value.safeBags,
    );
    const certs: { cert: pkijs.Certificate; id: string | null }[] = [];
    let key: { info: pkijs.PrivateKeyInfo; id: string | null } | null = null;
    for (const bag of bags) {
      if (bag.bagId === OID.certBag) {
        const value = (bag.bagValue as pkijs.CertBag).parsedValue;
        if (value instanceof pkijs.Certificate)
          certs.push({ cert: value, id: localKeyId(bag) });
      } else if (bag.bagId === OID.shroudedKeyBag && !key) {
        const shrouded = bag.bagValue as pkijs.PKCS8ShroudedKeyBag;
        if (legacy(shrouded.encryptionAlgorithm.algorithmId))
          throw invalid(LEGACY_MESSAGE);
        try {
          await (
            shrouded as unknown as {
              parseInternalValues(p: { password: ArrayBuffer }): Promise<void>;
            }
          ).parseInternalValues({ password: pwBuf });
        } catch (cause) {
          throw invalid(WRONG_PASSWORD, cause);
        }
        key = { info: shrouded.parsedValue!, id: localKeyId(bag) };
      } else if (bag.bagId === OID.keyBag && !key)
        key = {
          info: bag.bagValue as pkijs.PrivateKeyInfo,
          id: localKeyId(bag),
        };
    }
    if (!key) throw invalid(NO_KEY_MESSAGE);
    if (certs.length === 0) throw invalid('This file has no certificate');
    const algorithm = signingAlgorithm(key.info);
    if (!algorithm) throw invalid(KEY_TYPE_MESSAGE);
    const privateKey = await importSigningKey(
      new Uint8Array(key.info.toSchema().toBER(false)),
      algorithm,
    );
    const signer =
      (key.id && certs.find((c) => c.id === key.id)) ||
      (certs.filter((c) => !isCa(c.cert)).length === 1
        ? certs.find((c) => !isCa(c.cert))
        : certs[0])!;
    return {
      privateKey,
      algorithm,
      certificate: signer.cert,
      chain: certs.filter((c) => c !== signer).map((c) => c.cert),
      info: describeCertificate(signer.cert),
    };
  } finally {
    pw.fill(0);
  }
}
