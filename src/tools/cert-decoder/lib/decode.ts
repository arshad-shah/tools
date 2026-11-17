import type * as pkijs from 'pkijs';
import { toPem } from '@/shared/lib/crypto/keys';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { analyzeChain, type ChainLink } from './chain';
import { describeCsr, parseCsrDer, type CsrView } from './csr';
import {
  describePrivateKey,
  describePublicKey,
  type KeyInfo,
  type PrivateKeySummary,
} from './keys';
import { splitPem, type PemBlock } from './pem';
import { csrSigned, checkSignature, type SignatureCheck } from './verify';
import {
  describeCertificate,
  fingerprints,
  parseCertificateDer,
  type CertView,
  type Fingerprints,
} from './x509';

export type DecodedItem =
  | {
      kind: 'certificate';
      der: Uint8Array;
      view: CertView;
      fingerprints: Fingerprints;
      link: ChainLink | null;
    }
  | {
      kind: 'csr';
      der: Uint8Array;
      view: CsrView;
      signature: SignatureCheck;
      fingerprints: Fingerprints;
    }
  | { kind: 'public-key'; der: Uint8Array; key: KeyInfo; label: string }
  | { kind: 'private-key'; der: Uint8Array; summary: PrivateKeySummary }
  | { kind: 'error'; label: string; message: string };

/** Bare DER with no label: try a certificate, then a CSR, then a key. */
function guess(block: PemBlock): PemBlock {
  const tries: [PemBlock['kind'], (der: Uint8Array) => unknown][] = [
    ['certificate', parseCertificateDer],
    ['csr', parseCsrDer],
    ['public-key', (d) => describePublicKey(d, false)],
    ['private-key', (d) => describePrivateKey(d, 'private-key')],
  ];
  for (const [kind, parse] of tries) {
    try {
      parse(block.der);
      return { ...block, kind };
    } catch {
      // Try the next kind.
    }
  }
  return block;
}

async function decodeBlock(block: PemBlock): Promise<{
  item: DecodedItem;
  cert?: pkijs.Certificate;
}> {
  const label = block.label || 'The input';
  try {
    switch (block.kind) {
      case 'certificate': {
        const cert = parseCertificateDer(block.der);
        return {
          cert,
          item: {
            kind: 'certificate',
            der: block.der,
            view: describeCertificate(cert),
            fingerprints: await fingerprints(block.der),
            link: null,
          },
        };
      }
      case 'csr': {
        const csr = parseCsrDer(block.der);
        return {
          item: {
            kind: 'csr',
            der: block.der,
            view: describeCsr(csr),
            signature: await checkSignature(
              csrSigned(csr),
              csr.subjectPublicKeyInfo,
            ),
            fingerprints: await fingerprints(block.der),
          },
        };
      }
      case 'public-key':
      case 'rsa-public-key':
        return {
          item: {
            kind: 'public-key',
            der: block.der,
            key: describePublicKey(block.der, block.kind === 'rsa-public-key'),
            label,
          },
        };
      case 'private-key':
      case 'rsa-private-key':
      case 'ec-private-key':
      case 'encrypted-private-key':
        return {
          item: {
            kind: 'private-key',
            der: block.der,
            summary: describePrivateKey(block.der, block.kind),
          },
        };
      default:
        return {
          item: {
            kind: 'error',
            label,
            message: block.label
              ? `${block.label} blocks are not something this tool decodes`
              : 'This is not a certificate, request or key in DER or base64',
          },
        };
    }
  } catch (e) {
    return { item: { kind: 'error', label, message: toToolError(e).message } };
  }
}

/**
 * Every block in the input, decoded in order. Certificates are also read
 * as a chain in the order given. Nothing is fetched or sent anywhere.
 */
export async function decodeInput(text: string): Promise<DecodedItem[]> {
  const blocks = splitPem(text).map((b) => (b.label ? b : guess(b)));
  const decoded = await Promise.all(blocks.map(decodeBlock));
  const certs = decoded.flatMap((d) => (d.cert ? [d.cert] : []));
  if (certs.length) {
    const links = await analyzeChain(certs);
    let i = 0;
    for (const d of decoded)
      if (d.cert && d.item.kind === 'certificate') d.item.link = links[i++];
  }
  return decoded.map((d) => d.item);
}

const DER_LABELS: Partial<Record<PemBlock['kind'], string>> = {
  certificate: 'CERTIFICATE',
  csr: 'CERTIFICATE REQUEST',
  'public-key': 'PUBLIC KEY',
  'private-key': ['PRIVATE', 'KEY'].join(' '),
};

/** Binary DER from a file as PEM text, labelled by what it parses as. */
export function derToPem(der: Uint8Array): string {
  const label = DER_LABELS[guess({ label: '', kind: 'unknown', der }).kind];
  if (!label)
    throw new ToolError(
      'INVALID_FILE',
      'This file is not a certificate, request or key in DER form',
    );
  return toPem(label, der);
}
