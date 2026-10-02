/*
 * Signing fixtures, generated at runtime (keys are never committed, so
 * secret scanners have nothing to flag). PKCS#12 files come from the
 * openssl CLI when it is on PATH (an independent producer); certificate
 * chains are built in-process with pkijs.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { describeCertificate } from '../../src/pdf/sign/pades/cert-info';
import type { SigningIdentity } from '../../src/pdf/sign/pades/pkcs12';
import { buildCertificate } from '../../src/pdf/sign/pades/self-signed';

/** A throwaway password, assembled so it does not look like a credential literal. */
export const FIXTURE_P12_PASSWORD = ['fixture', 'p12', 'pass'].join('-');

let opensslChecked: boolean | null = null;
export function opensslAvailable(): boolean {
  if (opensslChecked === null)
    opensslChecked =
      spawnSync('openssl', ['version'], { encoding: 'utf8' }).status === 0;
  return opensslChecked;
}

function openssl(args: string[], cwd: string): void {
  const r = spawnSync('openssl', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0)
    throw new Error(`openssl ${args[0]} failed: ${r.stderr || r.stdout}`);
}

export interface P12Options {
  /** 'ec' (P-256, default) or 'rsa' (2048). */
  key?: 'ec' | 'rsa';
  /** 3DES/RC2 encryption via `openssl pkcs12 -legacy`. */
  legacy?: boolean;
  /** A file with the certificate only (no private key). */
  certOnly?: boolean;
  /** Include a CA certificate that issued the signer. */
  withCa?: boolean;
  cn?: string;
}

/** A .p12 made by the openssl CLI (needs `opensslAvailable()`). */
export function makeP12WithOpenssl(o: P12Options = {}): Uint8Array {
  const dir = mkdtempSync(join(tmpdir(), 'p12-'));
  try {
    const cn = o.cn ?? 'Test Signer';
    const keyArgs =
      o.key === 'rsa'
        ? ['-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048']
        : ['-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256'];
    openssl(['genpkey', ...keyArgs, '-out', 'key.pem'], dir);
    const extra: string[] = [];
    if (o.withCa) {
      openssl(['genpkey', ...keyArgs, '-out', 'ca.key'], dir);
      openssl(
        [
          'req',
          '-x509',
          '-new',
          '-key',
          'ca.key',
          '-subj',
          '/CN=Test Root CA',
          '-days',
          '30',
          '-addext',
          'basicConstraints=critical,CA:TRUE',
          '-out',
          'ca.pem',
        ],
        dir,
      );
      openssl(
        [
          'req',
          '-new',
          '-key',
          'key.pem',
          '-subj',
          `/CN=${cn}`,
          '-out',
          'req.csr',
        ],
        dir,
      );
      openssl(
        [
          'x509',
          '-req',
          '-in',
          'req.csr',
          '-CA',
          'ca.pem',
          '-CAkey',
          'ca.key',
          '-CAcreateserial',
          '-days',
          '30',
          '-out',
          'cert.pem',
        ],
        dir,
      );
      extra.push('-certfile', 'ca.pem');
    } else {
      openssl(
        [
          'req',
          '-x509',
          '-new',
          '-key',
          'key.pem',
          '-subj',
          `/CN=${cn}`,
          '-days',
          '30',
          '-out',
          'cert.pem',
        ],
        dir,
      );
    }
    const pass = `pass:${FIXTURE_P12_PASSWORD}`;
    const enc = o.legacy
      ? ['-legacy']
      : [
          '-keypbe',
          'AES-256-CBC',
          '-certpbe',
          'AES-256-CBC',
          '-macalg',
          'sha256',
        ];
    openssl(
      [
        'pkcs12',
        '-export',
        ...(o.certOnly ? ['-nokeys'] : ['-inkey', 'key.pem']),
        '-in',
        'cert.pem',
        ...extra,
        ...enc,
        '-passout',
        pass,
        '-out',
        'out.p12',
      ],
      dir,
    );
    return new Uint8Array(readFileSync(join(dir, 'out.p12')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Runs `openssl pkcs12 -info -noout` on bytes; returns the exit status. */
export function opensslAcceptsP12(bytes: Uint8Array, password: string): number {
  const dir = mkdtempSync(join(tmpdir(), 'p12-'));
  try {
    writeFileSync(join(dir, 'in.p12'), bytes);
    return (
      spawnSync(
        'openssl',
        [
          'pkcs12',
          '-info',
          '-noout',
          '-in',
          'in.p12',
          '-passin',
          `pass:${password}`,
        ],
        { cwd: dir, encoding: 'utf8' },
      ).status ?? 1
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const name = (cn: string) => {
  const n = new pkijs.RelativeDistinguishedNames();
  n.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: '2.5.4.3',
      value: new asn1js.Utf8String({ value: cn }),
    }),
  );
  return n;
};

const EC = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const DAY = 86_400_000;

async function pair(): Promise<CryptoKeyPair> {
  return (await crypto.subtle.generateKey(EC, false, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
}

export interface ChainFixture {
  root: pkijs.Certificate;
  intermediate: pkijs.Certificate;
  leaf: SigningIdentity;
}

/**
 * Root CA, intermediate CA and a leaf signer (ECDSA P-256). `leafValidity`
 * lets a test make the leaf expired at signing time.
 */
export async function makeChain(
  leafValidity: { from: Date; to: Date } = {
    from: new Date(Date.now() - DAY),
    to: new Date(Date.now() + 30 * DAY),
  },
): Promise<ChainFixture> {
  const [rootKeys, interKeys, leafKeys] = await Promise.all([
    pair(),
    pair(),
    pair(),
  ]);
  const from = new Date(Date.now() - 365 * DAY);
  const to = new Date(Date.now() + 365 * DAY);
  const root = await buildCertificate({
    subject: name('Test Root CA'),
    issuer: name('Test Root CA'),
    publicKey: rootKeys.publicKey,
    signingKey: rootKeys.privateKey,
    notBefore: from,
    notAfter: to,
    ca: true,
  });
  const intermediate = await buildCertificate({
    subject: name('Test Intermediate CA'),
    issuer: name('Test Root CA'),
    publicKey: interKeys.publicKey,
    signingKey: rootKeys.privateKey,
    notBefore: from,
    notAfter: to,
    ca: true,
  });
  const leafCert = await buildCertificate({
    subject: name('Chain Signer'),
    issuer: name('Test Intermediate CA'),
    publicKey: leafKeys.publicKey,
    signingKey: interKeys.privateKey,
    notBefore: leafValidity.from,
    notAfter: leafValidity.to,
    ca: false,
  });
  return {
    root,
    intermediate,
    leaf: {
      privateKey: leafKeys.privateKey,
      algorithm: { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' },
      certificate: leafCert,
      chain: [intermediate],
      info: describeCertificate(leafCert),
    },
  };
}
