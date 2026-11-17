import { utf8Encode } from '@/shared/lib/encoding';
import type { KeyMaterial } from './generate';
import { specSlug } from './spec';
import { sshPublicLine } from './ssh';

/** One exportable text: its id, label, file name and contents. */
export interface KeyExport {
  id: 'private-pem' | 'public-pem' | 'private-jwk' | 'public-jwk' | 'openssh';
  label: string;
  filename: string;
  mime: string;
  text: string;
  /** Holds the private key. */
  secret: boolean;
}

/** The OpenSSH default file stem for the key type: id_ed25519, id_rsa... */
function sshStem(m: KeyMaterial): string {
  if (!m.ssh) return `${specSlug(m.spec)}`;
  if (m.ssh.type === 'ssh-ed25519') return 'id_ed25519';
  if (m.ssh.type === 'ssh-rsa') return 'id_rsa';
  return 'id_ecdsa';
}

const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

/** Every export of a pair, private ones first. */
export function keyExports(m: KeyMaterial, comment: string): KeyExport[] {
  const slug = specSlug(m.spec);
  const out: KeyExport[] = [
    {
      id: 'private-pem',
      label: 'Private key (PKCS#8 PEM)',
      filename: `${slug}-private.pem`,
      mime: 'application/x-pem-file',
      text: m.privatePem,
      secret: true,
    },
    {
      id: 'public-pem',
      label: 'Public key (SPKI PEM)',
      filename: `${slug}-public.pem`,
      mime: 'application/x-pem-file',
      text: m.publicPem,
      secret: false,
    },
    {
      id: 'private-jwk',
      label: 'Private key (JWK)',
      filename: `${slug}-private.jwk.json`,
      mime: 'application/jwk+json',
      text: json(m.privateJwk),
      secret: true,
    },
    {
      id: 'public-jwk',
      label: 'Public key (JWK)',
      filename: `${slug}-public.jwk.json`,
      mime: 'application/jwk+json',
      text: json(m.publicJwk),
      secret: false,
    },
  ];
  if (m.ssh)
    out.push({
      id: 'openssh',
      label: 'OpenSSH public key',
      filename: `${sshStem(m)}.pub`,
      mime: 'text/plain',
      text: `${sshPublicLine(m.ssh, comment)}\n`,
      secret: false,
    });
  return out;
}

/** The ZIP entries for "Download all". */
export function zipEntries(m: KeyMaterial, comment: string) {
  return keyExports(m, comment).map((e) => ({
    name: e.filename,
    data: utf8Encode(e.text),
  }));
}

/** The ZIP's own name. */
export const zipName = (m: KeyMaterial) => `${specSlug(m.spec)}-keypair.zip`;
