import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { openIdb, WORKSPACE_DB, type IdbStore } from '@/shared/lib/storage';
import { makeChain } from '../../../../test/fixtures/signing';
import { certDer } from './cert-info';
import { createSelfSigned } from './self-signed';
import {
  addTrustedRoot,
  clearTrustedRoots,
  loadTrustedRoots,
  removeTrustedRoot,
} from './trust';

let db: IdbStore | null = null;
const open = async () =>
  (db = await openIdb({ ...WORKSPACE_DB, name: `trust-${Math.random()}` }));
afterEach(() => db?.close());

const pem = (der: Uint8Array) =>
  new TextEncoder().encode(
    `-----BEGIN CERTIFICATE-----\n${btoa(String.fromCharCode(...der))}\n-----END CERTIFICATE-----\n`,
  );

describe('trusted roots', () => {
  it('adds DER and PEM roots once, removes and clears them', async () => {
    const store = await open();
    const { root, intermediate } = await makeChain();
    const a = await addTrustedRoot(store, certDer(root));
    const b = await addTrustedRoot(store, pem(certDer(intermediate)));
    await addTrustedRoot(store, certDer(root));
    expect((await loadTrustedRoots(store)).length).toBe(2);
    await removeTrustedRoot(store, a.sha256);
    const left = await loadTrustedRoots(store);
    expect(left).toHaveLength(1);
    expect(b.subjectCN).toBe('Test Intermediate CA');
    await clearTrustedRoots(store);
    expect(await loadTrustedRoots(store)).toEqual([]);
  });

  it('refuses a leaf certificate that is neither a CA nor self-signed', async () => {
    const store = await open();
    const { leaf } = await makeChain();
    await expect(
      addTrustedRoot(store, certDer(leaf.certificate)),
    ).rejects.toMatchObject({
      code: 'CERTIFICATE_INVALID',
    });
  });

  it('accepts a self-signed certificate and refuses garbage', async () => {
    const store = await open();
    const id = await createSelfSigned({
      name: 'Self',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    expect(
      (await addTrustedRoot(store, certDer(id.certificate))).selfSigned,
    ).toBe(true);
    await expect(
      addTrustedRoot(store, new Uint8Array([1, 2, 3])),
    ).rejects.toMatchObject({
      code: 'CERTIFICATE_INVALID',
    });
  });
});
