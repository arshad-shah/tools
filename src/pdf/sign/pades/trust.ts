import * as pkijs from 'pkijs';
import { ToolError } from '@/shared/lib/errors';
import type { IdbStore } from '@/shared/lib/storage';
import {
  certDer,
  describeCertificate,
  parseCertificate,
  type CertInfo,
} from './cert-info';

/*
 * Root certificates the user imported for verification (decision G22):
 * stored on this device only, in the workspace database's profile store.
 * Only public certificates live here, never keys.
 */

const STORE = 'profile';
const KEY = 'trusted-roots';

async function readAll(db: IdbStore): Promise<Uint8Array[]> {
  const v = await db.get<unknown>(STORE, KEY);
  return Array.isArray(v) ? v.filter((x) => x instanceof Uint8Array) : [];
}

function parse(der: Uint8Array): pkijs.Certificate | null {
  try {
    return pkijs.Certificate.fromBER(der.slice().buffer);
  } catch {
    return null;
  }
}

export async function loadTrustedRoots(
  db: IdbStore,
): Promise<pkijs.Certificate[]> {
  return (await readAll(db))
    .map(parse)
    .filter((c): c is pkijs.Certificate => c !== null);
}

const isCa = (c: pkijs.Certificate) =>
  c.extensions?.some(
    (e) =>
      e.extnID === '2.5.29.19' &&
      (e.parsedValue as pkijs.BasicConstraints | undefined)?.cA === true,
  ) ?? false;

/** Adds a root (PEM or DER). It must be a CA or self-signed. */
export async function addTrustedRoot(
  db: IdbStore,
  bytes: Uint8Array,
): Promise<CertInfo> {
  let cert: pkijs.Certificate;
  try {
    cert = parseCertificate(bytes);
  } catch (cause) {
    throw new ToolError(
      'CERTIFICATE_INVALID',
      'This file is not a certificate (.cer, .crt, .pem or .der)',
      { cause },
    );
  }
  const info = describeCertificate(cert);
  if (!isCa(cert) && !info.selfSigned)
    throw new ToolError(
      'CERTIFICATE_INVALID',
      'This certificate is not a root or CA certificate, so it cannot be trusted as a root',
    );
  const all = await readAll(db);
  const known = all.some((d) => {
    const c = parse(d);
    return c !== null && describeCertificate(c).sha256 === info.sha256;
  });
  if (!known) await db.put(STORE, KEY, [...all, certDer(cert)]);
  return info;
}

export async function removeTrustedRoot(
  db: IdbStore,
  sha256: string,
): Promise<void> {
  const keep = (await readAll(db)).filter((d) => {
    const c = parse(d);
    return c !== null && describeCertificate(c).sha256 !== sha256;
  });
  await db.put(STORE, KEY, keep);
}

export async function clearTrustedRoots(db: IdbStore): Promise<void> {
  await db.delete(STORE, KEY);
}
