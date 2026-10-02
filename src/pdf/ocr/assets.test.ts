import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import {
  OCR_MANIFEST_URL,
  assertSameOrigin,
  downloadSize,
  hasCachedLanguage,
  loadOcrManifest,
  removeOcrData,
  simdSupported,
} from './assets';
import { fakeManifest } from './test-manifest';

afterEach(() => vi.unstubAllGlobals());

const codeOf = async (p: Promise<unknown>) =>
  p.then(
    () => 'resolved',
    (e: unknown) => (e instanceof ToolError ? e.code : String(e)),
  );

describe('downloadSize', () => {
  const m = fakeManifest();
  it('sums the worker, the SIMD core and the languages', () => {
    expect(downloadSize(m, ['eng'], true)).toBe(
      100_000 + 3_400_000 + 2_000_000,
    );
  });
  it('uses the plain core without SIMD', () => {
    expect(downloadSize(m, ['eng', 'fra'], false)).toBe(
      100_000 + 3_300_000 + 2_000_000 + 2_000_001,
    );
  });
});

describe('assertSameOrigin', () => {
  it('accepts same-origin paths', () => {
    expect(() => assertSameOrigin('/ocr/1/worker.min.js')).not.toThrow();
  });
  it('throws for another origin', () => {
    expect(() => assertSameOrigin('https://cdn.example/x')).toThrow(ToolError);
  });
});

describe('simdSupported', () => {
  it('answers from WebAssembly.validate', () => {
    expect(typeof simdSupported()).toBe('boolean');
    // Node 20+ supports wasm SIMD.
    expect(simdSupported()).toBe(true);
  });
});

describe('loadOcrManifest', () => {
  it('fetches the versioned manifest', async () => {
    const m = fakeManifest();
    const fetch = vi.fn(async () => new Response(JSON.stringify(m)));
    vi.stubGlobal('fetch', fetch);
    expect(await loadOcrManifest()).toEqual(m);
    expect(fetch).toHaveBeenCalledWith(OCR_MANIFEST_URL, expect.anything());
    expect(OCR_MANIFEST_URL).toMatch(
      /^\/ocr\/\d+\.\d+\.\d+\/ocr-manifest\.json$/,
    );
  });

  it('maps a failed fetch to NETWORK with the spec message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(loadOcrManifest()).rejects.toMatchObject({
      code: 'NETWORK',
      message:
        "Couldn't download OCR data. Check your connection and try again.",
    });
  });

  it('maps an HTTP error to NETWORK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    );
    expect(await codeOf(loadOcrManifest())).toBe('NETWORK');
  });

  it('refuses a manifest pointing at another origin', async () => {
    const m = fakeManifest();
    m.languages.eng.path = 'https://cdn.example/eng.traineddata.gz';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(m))),
    );
    expect(await codeOf(loadOcrManifest())).toBe('UNKNOWN');
  });
});

/** Writes a value the way tesseract.js (idb-keyval) does. */
const cacheWrite = (key: string) =>
  new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('keyval-store');
    req.onupgradeneeded = () => req.result.createObjectStore('keyval');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(new Uint8Array([1]), key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });

describe('OCR data cache', () => {
  it('reports cached languages and removes them', async () => {
    expect(await hasCachedLanguage('eng')).toBe(false);
    await cacheWrite('./eng.traineddata');
    await cacheWrite('other-key');
    expect(await hasCachedLanguage('eng')).toBe(true);
    expect(await hasCachedLanguage('fra')).toBe(false);
    await removeOcrData();
    expect(await hasCachedLanguage('eng')).toBe(false);
    // Only OCR language entries go.
    await cacheWrite('./deu.traineddata');
    expect(await hasCachedLanguage('deu')).toBe(true);
  });
});
