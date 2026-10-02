import { version as tesseractVersion } from 'tesseract.js/package.json';
import { ToolError } from '@/shared/lib/errors';
import { OCR_LANGUAGES, type OcrLanguage, type OcrManifest } from './types';

/*
 * Same-origin OCR assets (spec 11). Nothing is fetched before the person
 * consents; every URL the engine is given is checked to be on this origin
 * (decision G11).
 */

export const OCR_NETWORK_MESSAGE =
  "Couldn't download OCR data. Check your connection and try again.";

/** Where scripts/copy-ocr-assets.mjs writes the manifest for this build. */
export const OCR_MANIFEST_URL = `/ocr/${tesseractVersion}/ocr-manifest.json`;

const networkError = (cause?: unknown) =>
  new ToolError('NETWORK', OCR_NETWORK_MESSAGE, { cause });

/** Throws when `url` would leave this origin. */
export function assertSameOrigin(url: string): void {
  const origin = globalThis.location?.origin;
  const base = origin && origin !== 'null' ? origin : 'http://localhost';
  if (new URL(url, base).origin !== new URL(base).origin) {
    throw new ToolError(
      'UNKNOWN',
      `OCR data must come from this site, not ${url}`,
    );
  }
}

const manifestUrls = (m: OcrManifest) => [
  m.worker.path,
  m.core.simd.path,
  m.core.plain.path,
  ...Object.values(m.languages).map((l) => l.path),
];

/** Fetches this build's manifest. Failure is NETWORK, never a fallback. */
export async function loadOcrManifest(
  signal?: AbortSignal,
): Promise<OcrManifest> {
  let manifest: OcrManifest;
  try {
    const res = await fetch(OCR_MANIFEST_URL, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${OCR_MANIFEST_URL}`);
    manifest = (await res.json()) as OcrManifest;
  } catch (e) {
    if (signal?.aborted)
      throw new ToolError('CANCELLED', 'Cancelled', { cause: e });
    throw networkError(e);
  }
  for (const url of manifestUrls(manifest)) assertSameOrigin(url);
  return manifest;
}

/** wasm-feature-detect's SIMD probe: a module using v128 instructions. */
const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8,
  0, 65, 0, 253, 15, 253, 98, 11,
]);

export function simdSupported(): boolean {
  try {
    return WebAssembly.validate(SIMD_PROBE);
  } catch {
    return false;
  }
}

/** The core this device fetches. */
export const coreFor = (m: OcrManifest, simd = simdSupported()) =>
  simd ? m.core.simd : m.core.plain;

/** Bytes fetched on first use: worker, the matching core and the languages. */
export function downloadSize(
  m: OcrManifest,
  langs: readonly OcrLanguage[],
  simd = simdSupported(),
): number {
  return (
    m.worker.bytes +
    coreFor(m, simd).bytes +
    langs.reduce((sum, l) => sum + m.languages[l].bytes, 0)
  );
}

/*
 * tesseract.js caches language data with idb-keyval's default store
 * (database 'keyval-store', object store 'keyval') under the key
 * '<cachePath>/<lang>.traineddata'; the pool leaves cachePath at its
 * default '.'. Engine files stay in the HTTP cache.
 */
const CACHE_DB = 'keyval-store';
const CACHE_STORE = 'keyval';
const cacheKey = (lang: OcrLanguage) => `./${lang}.traineddata`;

function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB);
    // Same upgrade as idb-keyval, so opening first never leaves it storeless.
    req.onupgradeneeded = () => req.result.createObjectStore(CACHE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openCache();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, mode);
      const req = fn(tx.objectStore(CACHE_STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function hasCachedLanguage(lang: OcrLanguage): Promise<boolean> {
  const n = await withStore('readonly', (s) => s.count(cacheKey(lang)));
  return n > 0;
}

/** Deletes every cached language file (the engine stays in the HTTP cache). */
export async function removeOcrData(): Promise<void> {
  await withStore('readwrite', (s) => {
    let last: IDBRequest<undefined> | undefined;
    for (const lang of OCR_LANGUAGES) last = s.delete(cacheKey(lang));
    return last!;
  });
}
