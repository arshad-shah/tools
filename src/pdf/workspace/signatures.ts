import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { certDer } from '@/pdf/sign/pades/cert-info';
import { loadTrustedRoots } from '@/pdf/sign/pades/trust';
import type { SignatureReport } from '@/pdf/sign/pades/verify';
import type { WorkspaceSession } from './session';
import { getWorkspaceDb } from './workspace-db';

/** Bumped when the imported trusted roots change: reports re-verify. */
export const useTrustedRootsVersion = create(() => ({ version: 0 }));
export const trustedRootsChanged = () =>
  useTrustedRootsVersion.setState((s) => ({ version: s.version + 1 }));

/** DER of the imported roots (they are passed to the edit worker). */
async function rootsDer(): Promise<Uint8Array[]> {
  const db = await getWorkspaceDb();
  if (!db) return [];
  return (await loadTrustedRoots(db)).map(certDer);
}

const cache = new Map<string, Promise<SignatureReport[]>>();

/**
 * Signatures in the original document (checkpoint 0): signatures are only
 * meaningful over the bytes that were signed, so later checkpoints are not
 * re-verified. Shared by the top-bar badge, the Signatures panel and the
 * Export dialog; verified once per document and trusted-roots change.
 */
export function verifyOriginal(
  session: WorkspaceSession,
  version: number,
): Promise<SignatureReport[]> {
  const state = session.model.getState();
  const ckpt = state.checkpoints[0];
  const key = `${state.id}:${ckpt.id}:${version}`;
  let p = cache.get(key);
  if (!p) {
    p = Promise.all([session.blobs.checkpointBytes(ckpt.id), rootsDer()]).then(
      ([bytes, roots]) =>
        session.services.edit.call('verifySignatures', [bytes.slice(), roots]),
    );
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export interface DocumentSignatures {
  reports: SignatureReport[] | null;
  error: ToolError | null;
}

export function useDocumentSignatures(
  session: WorkspaceSession | null,
): DocumentSignatures {
  const version = useTrustedRootsVersion((s) => s.version);
  const [out, setOut] = useState<
    DocumentSignatures & { key: unknown; version: number }
  >({ reports: null, error: null, key: null, version });
  useEffect(() => {
    if (!session) return;
    let live = true;
    verifyOriginal(session, version).then(
      (reports) =>
        live && setOut({ reports, error: null, key: session, version }),
      (e) =>
        live &&
        setOut({ reports: null, error: toToolError(e), key: session, version }),
    );
    return () => {
      live = false;
    };
  }, [session, version]);
  return out.key === session && out.version === version
    ? { reports: out.reports, error: out.error }
    : { reports: null, error: null };
}
