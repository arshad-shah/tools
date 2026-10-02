import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { newId } from './id';
import { openIdb, isQuotaError, type IdbStore } from './storage';

const schema = () => ({
  name: `test-${newId()}`,
  version: 1,
  stores: ['blobs', 'logs'] as const,
});

let open: IdbStore[] = [];
afterEach(() => {
  for (const db of open) db.close();
  open = [];
});
const db = async () => {
  const d = await openIdb(schema(), indexedDB);
  open.push(d);
  return d;
};

describe('openIdb', () => {
  it('round-trips a Blob and a plain object', async () => {
    const d = await db();
    await d.put('blobs', 'a', new Blob(['hello']));
    await d.put('logs', 'b', { cursor: 2, log: [1, 2] });
    const blob = await d.get<Blob>('blobs', 'a');
    expect(await blob!.text()).toBe('hello');
    expect(await d.get('logs', 'b')).toEqual({ cursor: 2, log: [1, 2] });
    expect(await d.get('logs', 'missing')).toBeUndefined();
  });

  it('deletePrefix removes only keys under the prefix', async () => {
    const d = await db();
    for (const k of ['d1/ckpt/0', 'd1/asset/a', 'd10/ckpt/0'])
      await d.put('blobs', k, k);
    expect(await d.deletePrefix('blobs', 'd1/')).toBe(2);
    expect(await d.keys('blobs')).toEqual(['d10/ckpt/0']);
  });

  it('keys filters by prefix and getAll pairs keys with values', async () => {
    const d = await db();
    await d.put('blobs', 'x/1', 1);
    await d.put('blobs', 'y/1', 2);
    expect(await d.keys('blobs', 'x/')).toEqual(['x/1']);
    expect(await d.getAll('blobs')).toEqual([
      { key: 'x/1', value: 1 },
      { key: 'y/1', value: 2 },
    ]);
  });

  it('write commits across stores atomically', async () => {
    const d = await db();
    await d.write(['blobs', 'logs'], (tx) => {
      tx.put('blobs', 'k', 1);
      tx.put('logs', 'k', 2);
    });
    expect(await d.get('blobs', 'k')).toBe(1);
    expect(await d.get('logs', 'k')).toBe(2);
    await expect(
      d.write(['blobs', 'logs'], (tx) => {
        tx.put('blobs', 'k', 10);
        tx.delete('logs', 'k');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await d.get('blobs', 'k')).toBe(1);
    expect(await d.get('logs', 'k')).toBe(2);
  });

  it('maps a quota failure to STORAGE_FULL', async () => {
    const d = await db();
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('full', 'QuotaExceededError');
    };
    try {
      await expect(d.put('blobs', 'k', 1)).rejects.toMatchObject({
        code: 'STORAGE_FULL',
        message:
          "Your browser's storage is full. Clear old documents to keep saving locally.",
      });
      await expect(
        d.write(['blobs'], (tx) => tx.put('blobs', 'k', 1)),
      ).rejects.toMatchObject({ code: 'STORAGE_FULL' });
    } finally {
      IDBObjectStore.prototype.put = original;
    }
  });

  it('rejects with UNKNOWN when IndexedDB cannot open', async () => {
    const broken = {
      open() {
        throw new Error('no idb');
      },
    } as unknown as IDBFactory;
    await expect(openIdb(schema(), broken)).rejects.toMatchObject({
      code: 'UNKNOWN',
      message: 'Local storage is not available in this browser',
    });
  });

  it('isQuotaError recognises both browser names', () => {
    expect(isQuotaError(new DOMException('x', 'QuotaExceededError'))).toBe(
      true,
    );
    expect(isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isQuotaError(new Error('x'))).toBe(false);
  });
});
