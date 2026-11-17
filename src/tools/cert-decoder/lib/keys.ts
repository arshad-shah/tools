import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { ownBuffer } from '@/shared/lib/bytes';
import { ToolError } from '@/shared/lib/errors';
import { CURVES, KEY_ALGS, named } from './oids';

/** A key in plain terms; never its secret material. */
export interface KeyInfo {
  /** RSA, EC, Ed25519... */
  algorithm: string;
  oid: string;
  /** Key size in bits (RSA modulus, curve size). */
  bits: number | null;
  curve: string | null;
  /** "RSA 2048", "EC P-256", "Ed25519". */
  description: string;
  /** RSA public exponent, when known. */
  exponent: string | null;
}

const RSA = '1.2.840.113549.1.1.1';
const RSA_PSS = '1.2.840.113549.1.1.10';
const EC = '1.2.840.10045.2.1';
const ED = {
  '1.3.101.110': 255,
  '1.3.101.111': 448,
  '1.3.101.112': 255,
  '1.3.101.113': 448,
} as const;

const intBits = (bytes: Uint8Array) => {
  let i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0) i++;
  if (i >= bytes.length) return 0;
  return (bytes.length - i - 1) * 8 + (32 - Math.clz32(bytes[i]));
};

const intText = (int: asn1js.Integer) => {
  const hex = Array.from(int.valueBlock.valueHexView, (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  return BigInt(`0x${hex || '0'}`).toString();
};

function describe(info: Omit<KeyInfo, 'description'>): KeyInfo {
  const description = info.curve
    ? `${info.algorithm} ${info.curve}`
    : info.bits &&
        (info.algorithm === 'RSA' ||
          info.algorithm === 'RSA-PSS' ||
          info.algorithm === 'DSA')
      ? `${info.algorithm} ${info.bits}`
      : info.algorithm;
  return { ...info, description };
}

function curveOf(params: unknown): { name: string; bits: number } | null {
  if (params instanceof asn1js.ObjectIdentifier) {
    const oid = params.valueBlock.toString();
    return CURVES[oid] ?? { name: oid, bits: 0 };
  }
  return null;
}

/** What a SubjectPublicKeyInfo holds. */
export function describeSpki(spki: pkijs.PublicKeyInfo): KeyInfo {
  const oid = spki.algorithm.algorithmId;
  const algorithm = named(KEY_ALGS, oid);
  const base = { algorithm, oid, bits: null, curve: null, exponent: null };
  if (oid === RSA || oid === RSA_PSS) {
    try {
      const rsa = pkijs.RSAPublicKey.fromBER(
        ownBuffer(spki.subjectPublicKey.valueBlock.valueHexView),
      );
      return describe({
        ...base,
        bits: intBits(rsa.modulus.valueBlock.valueHexView),
        exponent: intText(rsa.publicExponent),
      });
    } catch {
      return describe(base);
    }
  }
  if (oid === EC) {
    const curve = curveOf(spki.algorithm.algorithmParams);
    return describe({
      ...base,
      curve: curve?.name ?? null,
      bits: curve?.bits || null,
    });
  }
  if (oid in ED) return describe({ ...base, bits: ED[oid as keyof typeof ED] });
  return describe(base);
}

export interface PrivateKeySummary {
  /** PKCS #8, PKCS #1 (RSA), SEC 1 (EC) or encrypted PKCS #8. */
  format: string;
  key: KeyInfo | null;
  encrypted: boolean;
}

/** The kind and size of a private key, never its value. */
export function describePrivateKey(
  der: Uint8Array,
  kind:
    | 'private-key'
    | 'rsa-private-key'
    | 'ec-private-key'
    | 'encrypted-private-key',
): PrivateKeySummary {
  const buf = ownBuffer(der);
  try {
    if (kind === 'encrypted-private-key')
      return { format: 'Encrypted private key', key: null, encrypted: true };
    if (kind === 'rsa-private-key') {
      const rsa = pkijs.RSAPrivateKey.fromBER(buf);
      return {
        format: 'PKCS #1 RSA private key',
        key: describe({
          algorithm: 'RSA',
          oid: RSA,
          bits: intBits(rsa.modulus.valueBlock.valueHexView),
          curve: null,
          exponent: intText(rsa.publicExponent),
        }),
        encrypted: false,
      };
    }
    if (kind === 'ec-private-key') {
      const ec = pkijs.ECPrivateKey.fromBER(buf);
      const curve = ec.namedCurve ? (CURVES[ec.namedCurve] ?? null) : null;
      return {
        format: 'SEC 1 EC private key',
        key: describe({
          algorithm: 'EC',
          oid: EC,
          bits: curve?.bits ?? null,
          curve: curve?.name ?? ec.namedCurve ?? null,
          exponent: null,
        }),
        encrypted: false,
      };
    }
    const pk = pkijs.PrivateKeyInfo.fromBER(buf);
    const oid = pk.privateKeyAlgorithm.algorithmId;
    let key: KeyInfo;
    if (oid === RSA || oid === RSA_PSS) {
      const rsa = pkijs.RSAPrivateKey.fromBER(
        ownBuffer(pk.privateKey.valueBlock.valueHexView),
      );
      key = describe({
        algorithm: named(KEY_ALGS, oid),
        oid,
        bits: intBits(rsa.modulus.valueBlock.valueHexView),
        curve: null,
        exponent: intText(rsa.publicExponent),
      });
    } else if (oid === EC) {
      const curve = curveOf(pk.privateKeyAlgorithm.algorithmParams);
      key = describe({
        algorithm: 'EC',
        oid,
        bits: curve?.bits || null,
        curve: curve?.name ?? null,
        exponent: null,
      });
    } else {
      key = describe({
        algorithm: named(KEY_ALGS, oid),
        oid,
        bits: oid in ED ? ED[oid as keyof typeof ED] : null,
        curve: null,
        exponent: null,
      });
    }
    return { format: 'PKCS #8 private key', key, encrypted: false };
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      'This private key block could not be read',
      {
        cause,
      },
    );
  }
}

/** A PUBLIC KEY (SPKI) or RSA PUBLIC KEY (PKCS #1) block. */
export function describePublicKey(der: Uint8Array, pkcs1: boolean): KeyInfo {
  const buf = ownBuffer(der);
  try {
    if (pkcs1) {
      const rsa = pkijs.RSAPublicKey.fromBER(buf);
      return describe({
        algorithm: 'RSA',
        oid: RSA,
        bits: intBits(rsa.modulus.valueBlock.valueHexView),
        curve: null,
        exponent: intText(rsa.publicExponent),
      });
    }
    return describeSpki(pkijs.PublicKeyInfo.fromBER(buf));
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      'This public key block could not be read',
      {
        cause,
      },
    );
  }
}
