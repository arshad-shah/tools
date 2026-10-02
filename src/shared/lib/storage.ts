import { ToolError } from './errors';

/** One IndexedDB database: its name, version and object stores. */
export interface IdbSchema {
  name: string;
  version: number;
  stores: readonly string[];
}

export interface IdbStore {
  get<T>(store: string, key: string): Promise<T | undefined>;
  put(store: string, key: string, value: unknown): Promise<void>;
  delete(store: string, key: string): Promise<void>;
  deletePrefix(store: string, prefix: string): Promise<number>;
  keys(store: string, prefix?: string): Promise<string[]>;
  getAll<T>(store: string): Promise<{ key: string; value: T }[]>;
  /** One transaction across stores; `fn` must only queue requests (no awaits on other promises). */
  write(
    stores: string[],
    fn: (tx: {
      put(store: string, key: string, value: unknown): void;
      delete(store: string, key: string): void;
    }) => void,
  ): Promise<void>;
  close(): void;
}

/** The workspace's local database (spec §6.6). */
export const WORKSPACE_DB = {
  name: 'tools-workspace',
  version: 1,
  stores: ['documents', 'blobs', 'logs', 'profile'],
} as const satisfies IdbSchema;

const FULL =
  "Your browser's storage is full. Clear old documents to keep saving locally.";

export function isQuotaError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(
      (e as { name?: string }).name ?? '',
    )
  );
}

const mapError = (e: unknown) =>
  e instanceof ToolError
    ? e
    : isQuotaError(e)
      ? new ToolError('STORAGE_FULL', FULL, { cause: e })
      : new ToolError('UNKNOWN', 'Saving on this device failed', { cause: e });

const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(mapError(r.error));
  });

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(mapError(tx.error));
    tx.onabort = () =>
      reject(mapError(tx.error ?? new DOMException('Aborted', 'AbortError')));
  });

/** Upper bound of every key that starts with `prefix`. */
const upper = (prefix: string) => prefix + String.fromCharCode(0xffff);
const range = (prefix: string) => IDBKeyRange.bound(prefix, upper(prefix));

/**
 * Runs `queue` inside a readwrite transaction and waits for it to commit. A
 * synchronous throw (e.g. QuotaExceededError from put) aborts the
 * transaction and rejects with the mapped error.
 */
async function inTransaction(
  db: IDBDatabase,
  stores: string | string[],
  queue: (tx: IDBTransaction) => void,
  map: (e: unknown) => unknown = mapError,
): Promise<void> {
  const tx = db.transaction(stores, 'readwrite');
  const completed = done(tx);
  try {
    queue(tx);
  } catch (e) {
    completed.catch(() => {}); // the abort below rejects it; we report `e`
    try {
      tx.abort();
    } catch {
      // Already finished or aborted.
    }
    throw map(e);
  }
  await completed;
}

export async function openIdb(
  schema: IdbSchema,
  factory: IDBFactory = globalThis.indexedDB,
): Promise<IdbStore> {
  let db: IDBDatabase;
  try {
    const open = factory.open(schema.name, schema.version);
    open.onupgradeneeded = () => {
      for (const s of schema.stores)
        if (!open.result.objectStoreNames.contains(s))
          open.result.createObjectStore(s);
    };
    db = await req(open);
  } catch (cause) {
    throw new ToolError(
      'UNKNOWN',
      'Local storage is not available in this browser',
      { cause },
    );
  }
  const read = async <T>(
    name: string,
    fn: (os: IDBObjectStore) => IDBRequest<T>,
  ) => {
    try {
      return await req(fn(db.transaction(name, 'readonly').objectStore(name)));
    } catch (e) {
      throw mapError(e);
    }
  };
  return {
    get: <T>(s: string, k: string) =>
      read(s, (os) => os.get(k) as IDBRequest<T | undefined>),
    put: (s, k, v) =>
      inTransaction(db, s, (tx) => void tx.objectStore(s).put(v, k)),
    delete: (s, k) =>
      inTransaction(db, s, (tx) => void tx.objectStore(s).delete(k)),
    async deletePrefix(s, prefix) {
      let n = 0;
      await inTransaction(db, s, (tx) => {
        const os = tx.objectStore(s);
        const count = os.count(range(prefix));
        count.onsuccess = () => {
          n = count.result;
        };
        os.delete(range(prefix));
      });
      return n;
    },
    keys: async (s, prefix) =>
      (
        await read(s, (os) =>
          os.getAllKeys(prefix === undefined ? undefined : range(prefix)),
        )
      ).map(String),
    async getAll<T>(s: string) {
      const os = db.transaction(s, 'readonly').objectStore(s);
      try {
        const [keys, values] = await Promise.all([
          req(os.getAllKeys()),
          req(os.getAll() as IDBRequest<T[]>),
        ]);
        return keys.map((key, i) => ({ key: String(key), value: values[i] }));
      } catch (e) {
        throw mapError(e);
      }
    },
    write: (stores, fn) =>
      inTransaction(
        db,
        stores,
        (tx) =>
          fn({
            put: (s, k, v) => void tx.objectStore(s).put(v, k),
            delete: (s, k) => void tx.objectStore(s).delete(k),
          }),
        // The caller's own errors pass through unchanged; only storage
        // failures are mapped.
        (e) => (isQuotaError(e) ? mapError(e) : e),
      ),
    close: () => db.close(),
  };
}

/** Usage and quota of this origin's storage, or null when the browser won't say. */
export async function estimateQuota(): Promise<{
  usage: number;
  quota: number;
} | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e && e.quota ? { usage: e.usage ?? 0, quota: e.quota } : null;
  } catch {
    return null;
  }
}

/** Asks the browser not to evict our storage; false when refused or unsupported. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
