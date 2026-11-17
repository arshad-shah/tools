import { toPem } from '@/shared/lib/crypto/keys';
import { bytesToBase64 } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import {
  isSigning,
  joseAlg,
  joseUse,
  keyGenParams,
  keyUsages,
  type Algorithm,
  type KeySpec,
} from './spec';
import { sshFingerprint, sshPublicKey } from './ssh';
import { jwkThumbprint } from './thumbprint';

/** The OpenSSH view of a signing key's public half. */
export interface SshInfo {
  type: string;
  blob: Uint8Array;
  bits: number;
  label: string;
  /** `SHA256:...` as ssh-keygen -l prints it. */
  fingerprint: string;
}

/** Everything one generated pair exports to. Held in memory only. */
export interface KeyMaterial {
  spec: KeySpec;
  /** PKCS#8 private key, PEM. */
  privatePem: string;
  /** SPKI public key, PEM. */
  publicPem: string;
  privateJwk: JsonWebKey & { kid: string };
  publicJwk: JsonWebKey & { kid: string };
  /** RFC 7638 thumbprint, also the JWKs' kid. */
  kid: string;
  /** SHA-256 of the SPKI DER, Base64 without padding. */
  spkiFingerprint: string;
  /** Absent for key-agreement and encryption keys. */
  ssh: SshInfo | null;
  /** When it was made (ms since epoch). */
  created: number;
}

const subtle = () => {
  if (!globalThis.crypto?.subtle)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser has no Web Crypto (it needs a secure https page)',
    );
  return globalThis.crypto.subtle;
};

/** Member order for display: kty and its parameters, then the rest. */
function ordered(
  jwk: JsonWebKey,
  extra: Record<string, unknown>,
): JsonWebKey & { kid: string } {
  const drop = new Set(['key_ops', 'ext', 'alg']);
  const rest = Object.fromEntries(
    Object.entries(jwk).filter(([k]) => !drop.has(k)),
  );
  return { kty: jwk.kty, ...rest, ...extra } as JsonWebKey & { kid: string };
}

/** Generates a key pair and exports it to every format. */
export async function generateKeyMaterial(spec: KeySpec): Promise<KeyMaterial> {
  const api = subtle();
  let pair: CryptoKeyPair;
  try {
    pair = (await api.generateKey(
      keyGenParams(spec),
      true,
      keyUsages(spec.algorithm),
    )) as CryptoKeyPair;
  } catch (cause) {
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `This browser cannot generate ${spec.algorithm} keys`,
      { cause },
    );
  }
  const [spki, pkcs8, pubJwk, privJwk] = await Promise.all([
    api.exportKey('spki', pair.publicKey),
    api.exportKey('pkcs8', pair.privateKey),
    api.exportKey('jwk', pair.publicKey),
    api.exportKey('jwk', pair.privateKey),
  ]);
  const kid = await jwkThumbprint(pubJwk);
  const tags = { kid, use: joseUse(spec.algorithm), alg: joseAlg(spec) };
  const spkiDigest = new Uint8Array(await api.digest('SHA-256', spki));
  let ssh: SshInfo | null = null;
  if (isSigning(spec.algorithm)) {
    const key = sshPublicKey(pubJwk);
    ssh = { ...key, fingerprint: await sshFingerprint(key.blob) };
  }
  return {
    spec,
    privatePem: toPem('PRIVATE KEY', new Uint8Array(pkcs8)),
    publicPem: toPem('PUBLIC KEY', new Uint8Array(spki)),
    privateJwk: ordered(privJwk, tags),
    publicJwk: ordered(pubJwk, tags),
    kid,
    spkiFingerprint: bytesToBase64(spkiDigest, { padding: false }),
    ssh,
    created: Date.now(),
  };
}

/**
 * Whether this browser can generate `algorithm` keys at all (Ed25519 and
 * X25519 arrived late in some browsers). RSA is assumed: probing it is slow.
 */
export async function supportsAlgorithm(
  algorithm: Algorithm,
): Promise<boolean> {
  if (algorithm !== 'Ed25519' && algorithm !== 'X25519') return true;
  try {
    await subtle().generateKey(
      { name: algorithm },
      false,
      keyUsages(algorithm),
    );
    return true;
  } catch {
    return false;
  }
}
