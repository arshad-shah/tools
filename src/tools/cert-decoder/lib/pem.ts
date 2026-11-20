import { ToolError } from '@/shared/lib/errors';

export type BlockKind =
  | 'certificate'
  | 'csr'
  | 'public-key'
  | 'rsa-public-key'
  | 'private-key'
  | 'rsa-private-key'
  | 'ec-private-key'
  | 'encrypted-private-key'
  | 'unknown';

/** One PEM block (or a bare DER/base64 blob) found in the input. */
export interface PemBlock {
  /** The PEM label, such as CERTIFICATE; empty for bare base64. */
  label: string;
  kind: BlockKind;
  der: Uint8Array;
}

const KINDS: Record<string, BlockKind> = {
  CERTIFICATE: 'certificate',
  'X509 CERTIFICATE': 'certificate',
  'TRUSTED CERTIFICATE': 'certificate',
  'CERTIFICATE REQUEST': 'csr',
  'NEW CERTIFICATE REQUEST': 'csr',
  'PUBLIC KEY': 'public-key',
  'RSA PUBLIC KEY': 'rsa-public-key',
  'PRIVATE KEY': 'private-key',
  'RSA PRIVATE KEY': 'rsa-private-key',
  'EC PRIVATE KEY': 'ec-private-key',
  'ENCRYPTED PRIVATE KEY': 'encrypted-private-key',
};

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);

/** Decodes base64 (whitespace ignored), or says why it cannot. */
export function fromBase64(text: string, what: string): Uint8Array {
  const clean = text.replace(/\s+/g, '');
  if (!clean) throw invalid(`${what} is empty`);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean) || clean.length % 4 === 1)
    throw invalid(`${what} is not valid base64`);
  const bin = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const BLOCK_RE =
  /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END ([A-Z0-9 ]+)-----/g;

/**
 * Every PEM block in the text, in order. Text with no PEM armour is read
 * as one base64 DER blob. Headers inside a block (Proc-Type, DEK-Info of
 * legacy encrypted keys) are skipped.
 */
export function splitPem(input: string): PemBlock[] {
  const text = input.trim();
  if (!text) return [];
  const blocks: PemBlock[] = [];
  let any = false;
  for (const m of text.matchAll(BLOCK_RE)) {
    any = true;
    const [, begin, body, end] = m;
    if (begin !== end)
      throw invalid(`A block begins as ${begin} but ends as ${end}`);
    const lines = body.split('\n').filter((l) => !/^[A-Za-z-]+:/.test(l));
    const encryptedLegacy = /Proc-Type:\s*4,ENCRYPTED/.test(body);
    blocks.push({
      label: begin,
      kind: encryptedLegacy
        ? 'encrypted-private-key'
        : (KINDS[begin] ?? 'unknown'),
      der: fromBase64(lines.join(''), `The ${begin} block`),
    });
  }
  if (any) return blocks;
  if (text.includes('-----BEGIN'))
    throw invalid('A PEM block has a BEGIN line but no matching END line');
  return [{ label: '', kind: 'unknown', der: fromBase64(text, 'The input') }];
}

/** Whether bytes are text (PEM) rather than binary DER. */
export function looksLikeText(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, 64);
  if (head[0] === 0x30) return false;
  return head.every(
    (b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127),
  );
}
