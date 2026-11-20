import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { CURVES, named, SIGNATURE_ALGS } from './oids';

export type SignatureCheck =
  | { state: 'valid'; algorithm: string; note?: string }
  | { state: 'invalid'; algorithm: string; reason: string }
  | { state: 'unsupported'; algorithm: string; reason: string };

const HASH_OF: Record<string, string> = {
  '1.2.840.113549.1.1.5': 'SHA-1',
  '1.2.840.113549.1.1.11': 'SHA-256',
  '1.2.840.113549.1.1.12': 'SHA-384',
  '1.2.840.113549.1.1.13': 'SHA-512',
  '1.2.840.10045.4.1': 'SHA-1',
  '1.2.840.10045.4.3.2': 'SHA-256',
  '1.2.840.10045.4.3.3': 'SHA-384',
  '1.2.840.10045.4.3.4': 'SHA-512',
};

const DIGEST_OIDS: Record<string, string> = {
  '1.3.14.3.2.26': 'SHA-1',
  '2.16.840.1.101.3.4.2.1': 'SHA-256',
  '2.16.840.1.101.3.4.2.2': 'SHA-384',
  '2.16.840.1.101.3.4.2.3': 'SHA-512',
};

const RSA_PKCS1 = new Set([
  '1.2.840.113549.1.1.5',
  '1.2.840.113549.1.1.11',
  '1.2.840.113549.1.1.12',
  '1.2.840.113549.1.1.13',
]);
const ECDSA = new Set([
  '1.2.840.10045.4.1',
  '1.2.840.10045.4.3.2',
  '1.2.840.10045.4.3.3',
  '1.2.840.10045.4.3.4',
]);
const RSA_PSS = '1.2.840.113549.1.1.10';
const ED25519 = '1.3.101.112';

/** An ECDSA DER signature (SEQUENCE of r, s) as raw r || s for WebCrypto. */
export function ecdsaDerToRaw(der: Uint8Array, size: number): Uint8Array {
  const parsed = asn1js.fromBER(ownBuffer(der));
  const seq = parsed.result as asn1js.Sequence;
  if (parsed.offset === -1 || !(seq instanceof asn1js.Sequence))
    throw new Error('Not an ECDSA signature');
  const out = new Uint8Array(size * 2);
  seq.valueBlock.value.slice(0, 2).forEach((v, i) => {
    let bytes = (v as asn1js.Integer).valueBlock.valueHexView;
    while (bytes.length > size && bytes[0] === 0) bytes = bytes.subarray(1);
    if (bytes.length > size) throw new Error('ECDSA integer too long');
    out.set(bytes, i * size + size - bytes.length);
  });
  return out;
}

interface Signed {
  tbs: Uint8Array;
  algorithm: pkijs.AlgorithmIdentifier;
  signature: Uint8Array;
}

/**
 * Checks a signature with WebCrypto against the signer's public key.
 * Algorithms WebCrypto (or this browser) cannot check are reported as
 * unsupported, never as valid or invalid.
 */
export async function checkSignature(
  signed: Signed,
  signerKey: pkijs.PublicKeyInfo,
): Promise<SignatureCheck> {
  const oid = signed.algorithm.algorithmId;
  const algorithm = named(SIGNATURE_ALGS, oid);
  const spki = ownBuffer(new Uint8Array(signerKey.toSchema().toBER(false)));
  const data = ownBuffer(signed.tbs);
  let sig = ownBuffer(signed.signature);
  let importAlg:
    | AlgorithmIdentifier
    | RsaHashedImportParams
    | EcKeyImportParams;
  let verifyAlg: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
  let note: string | undefined;

  if (RSA_PKCS1.has(oid)) {
    importAlg = { name: 'RSASSA-PKCS1-v1_5', hash: HASH_OF[oid] };
    verifyAlg = { name: 'RSASSA-PKCS1-v1_5' };
  } else if (oid === RSA_PSS) {
    const params = signed.algorithm.algorithmParams
      ? new pkijs.RSASSAPSSParams({ schema: signed.algorithm.algorithmParams })
      : new pkijs.RSASSAPSSParams();
    const hash = DIGEST_OIDS[params.hashAlgorithm.algorithmId];
    if (!hash)
      return {
        state: 'unsupported',
        algorithm,
        reason: `RSASSA-PSS with digest ${params.hashAlgorithm.algorithmId} cannot be checked here`,
      };
    importAlg = { name: 'RSA-PSS', hash };
    verifyAlg = { name: 'RSA-PSS', saltLength: params.saltLength };
  } else if (ECDSA.has(oid)) {
    const curveOid =
      signerKey.algorithm.algorithmParams instanceof asn1js.ObjectIdentifier
        ? signerKey.algorithm.algorithmParams.valueBlock.toString()
        : '';
    const curve = CURVES[curveOid];
    if (!curve || !['P-256', 'P-384', 'P-521'].includes(curve.name))
      return {
        state: 'unsupported',
        algorithm,
        reason: `The signer's curve (${curve?.name ?? (curveOid || 'unknown')}) is not one WebCrypto supports`,
      };
    importAlg = { name: 'ECDSA', namedCurve: curve.name };
    verifyAlg = { name: 'ECDSA', hash: HASH_OF[oid] };
    try {
      sig = ownBuffer(ecdsaDerToRaw(sig, Math.ceil(curve.bits / 8)));
    } catch {
      return {
        state: 'invalid',
        algorithm,
        reason: 'The ECDSA signature is malformed',
      };
    }
  } else if (oid === ED25519) {
    importAlg = { name: 'Ed25519' };
    verifyAlg = { name: 'Ed25519' };
  } else {
    return {
      state: 'unsupported',
      algorithm,
      reason: `${algorithm} is not supported by WebCrypto, so it was not checked`,
    };
  }
  if (HASH_OF[oid] === 'SHA-1')
    note = 'SHA-1 signatures are no longer trusted by browsers';

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey('spki', spki, importAlg, false, [
      'verify',
    ]);
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'NotSupportedError')
      return {
        state: 'unsupported',
        algorithm,
        reason: `This browser cannot check ${algorithm} signatures`,
      };
    return {
      state: 'invalid',
      algorithm,
      reason: "The signer's public key does not fit the signature algorithm",
    };
  }
  try {
    const ok = await crypto.subtle.verify(verifyAlg, key, sig, data);
    return ok
      ? note
        ? { state: 'valid', algorithm, note }
        : { state: 'valid', algorithm }
      : { state: 'invalid', algorithm, reason: 'The signature does not match' };
  } catch {
    return {
      state: 'invalid',
      algorithm,
      reason: 'The signature could not be checked',
    };
  }
}

export const certSigned = (c: pkijs.Certificate): Signed => ({
  tbs: c.tbsView,
  algorithm: c.signatureAlgorithm,
  signature: c.signatureValue.valueBlock.valueHexView,
});

export const csrSigned = (c: pkijs.CertificationRequest): Signed => ({
  tbs: c.tbsView,
  algorithm: c.signatureAlgorithm,
  signature: c.signatureValue.valueBlock.valueHexView,
});
