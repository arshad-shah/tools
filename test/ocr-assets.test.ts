import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  OCR_MANIFEST_FILE,
  copyOcrAssets,
  manifestUrl,
  type OcrAssetManifest,
} from '../scripts/copy-ocr-assets.mjs';

const nodeModules = join(process.cwd(), 'node_modules');
let publicDir: string;
let manifest: OcrAssetManifest;
let version: string;

/** A served URL path to the file it names under publicDir. */
const onDisk = (url: string) =>
  join(publicDir, ...url.split('/').filter(Boolean));

beforeAll(async () => {
  publicDir = await mkdtemp(join(tmpdir(), 'ocr-assets-'));
  // A sibling outside public/ocr must survive, and an old version folder must go.
  await writeFile(join(publicDir, 'keep.txt'), 'keep');
  await mkdir(join(publicDir, 'ocr', '0.0.1'), { recursive: true });
  ({ manifest, version } = await copyOcrAssets({ nodeModules, publicDir }));
}, 60_000);

afterAll(async () => {
  await rm(publicDir, { recursive: true, force: true });
});

describe('copyOcrAssets', () => {
  it('writes the manifest under the versioned folder', () => {
    const written = JSON.parse(
      readFileSync(join(publicDir, 'ocr', version, OCR_MANIFEST_FILE), 'utf8'),
    );
    expect(written).toEqual(manifest);
    expect(manifestUrl(version)).toBe(`/ocr/${version}/${OCR_MANIFEST_FILE}`);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('lists the ten Latin-script languages with labels and sizes', () => {
    expect(Object.keys(manifest.languages)).toEqual([
      'eng',
      'fra',
      'deu',
      'spa',
      'ita',
      'por',
      'nld',
      'gle',
      'pol',
      'swe',
    ]);
    expect(manifest.languages.eng.label).toBe('English');
    expect(manifest.languages.gle.label).toBe('Irish');
    for (const lang of Object.values(manifest.languages)) {
      expect(lang.bytes).toBeGreaterThan(0);
      expect(lang.path).toMatch(/\.traineddata\.gz$/);
    }
  });

  it('uses same-origin absolute paths whose files exist with the exact size', () => {
    const entries = [
      manifest.worker,
      manifest.core.simd,
      manifest.core.plain,
      ...Object.values(manifest.languages),
    ];
    for (const entry of entries) {
      expect(entry.path.startsWith(`/ocr/${version}/`)).toBe(true);
      expect(statSync(onDisk(entry.path)).size).toBe(entry.bytes);
    }
    expect(
      manifest.core.simd.path.startsWith(`${manifest.core.simd.dir}/`),
    ).toBe(true);
    expect(manifest.core.simd.path).toMatch(/simd-lstm\.wasm\.js$/);
    expect(manifest.core.plain.path).toMatch(/core-lstm\.wasm\.js$/);
  });

  it('touches nothing outside public/ocr and drops old version folders', () => {
    expect(readFileSync(join(publicDir, 'keep.txt'), 'utf8')).toBe('keep');
    expect(existsSync(join(publicDir, 'ocr', '0.0.1'))).toBe(false);
  });

  it('is idempotent and re-copies a file that is older or damaged', async () => {
    const again = await copyOcrAssets({ nodeModules, publicDir });
    expect(again.copied).toBe(0);
    const worker = onDisk(manifest.worker.path);
    await writeFile(worker, 'damaged');
    await utimes(worker, new Date(0), new Date(0));
    const repaired = await copyOcrAssets({ nodeModules, publicDir });
    expect(repaired.copied).toBe(1);
    expect(statSync(worker).size).toBe(manifest.worker.bytes);
  });
});
