import type { LocalCommand } from '@/app/ui/production-use';
import type { KeySpec } from './spec';

const CURVE_NAME = {
  'P-256': 'P-256',
  'P-384': 'P-384',
  'P-521': 'P-521',
} as const;

const CURVE_BITS = { 'P-256': 256, 'P-384': 384, 'P-521': 521 } as const;

/** Shell-quotes a comment for ssh-keygen -C. */
function quote(text: string): string {
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

/**
 * The same key pair made with OpenSSL (and ssh-keygen for signing keys) on
 * the user's own machine: PKCS#8 private and SPKI public PEM, as this tool
 * exports.
 */
export function localCommands(spec: KeySpec, comment = ''): LocalCommand[] {
  const pub: LocalCommand = {
    label: 'Public key (PEM) from the private key',
    command: 'openssl pkey -in private.pem -pubout -out public.pem',
  };
  const c = comment.trim() ? ` -C ${quote(comment.trim())}` : '';
  switch (spec.algorithm) {
    case 'RSA-OAEP':
    case 'RSASSA-PKCS1-v1_5':
      return [
        {
          label: `Private key, RSA ${spec.size} (PEM)`,
          command: `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:${spec.size} -out private.pem`,
        },
        pub,
        ...(spec.algorithm === 'RSASSA-PKCS1-v1_5'
          ? [
              {
                label: 'OpenSSH key pair',
                command: `ssh-keygen -t rsa -b ${spec.size}${c} -f id_rsa`,
              },
            ]
          : []),
      ];
    case 'RSA-PSS':
      return [
        {
          label: `Private key, RSA-PSS ${spec.size} (PEM)`,
          command: `openssl genpkey -algorithm RSA-PSS -pkeyopt rsa_keygen_bits:${spec.size} -out private.pem`,
        },
        pub,
      ];
    case 'ECDSA':
    case 'ECDH':
      return [
        {
          label: `Private key, ${spec.curve} (PEM)`,
          command: `openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:${CURVE_NAME[spec.curve]} -out private.pem`,
        },
        pub,
        ...(spec.algorithm === 'ECDSA'
          ? [
              {
                label: 'OpenSSH key pair',
                command: `ssh-keygen -t ecdsa -b ${CURVE_BITS[spec.curve]}${c} -f id_ecdsa`,
              },
            ]
          : []),
      ];
    case 'Ed25519':
      return [
        {
          label: 'Private key, Ed25519 (PEM)',
          command: 'openssl genpkey -algorithm ed25519 -out private.pem',
        },
        pub,
        {
          label: 'OpenSSH key pair',
          command: `ssh-keygen -t ed25519${c} -f id_ed25519`,
        },
      ];
    case 'X25519':
      return [
        {
          label: 'Private key, X25519 (PEM)',
          command: 'openssl genpkey -algorithm x25519 -out private.pem',
        },
        pub,
      ];
  }
}
