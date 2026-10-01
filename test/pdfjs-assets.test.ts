import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PDFJS_ASSET_DIRS,
  PDFJS_STAMP_FILE,
  syncPdfjsAssets,
} from '../scripts/pdfjs-assets.mjs';

let root: string;
let srcDir: string;
let destDir: string;
let workDir: string;

const writeSrc = async (content: string) => {
  for (const dir of PDFJS_ASSET_DIRS) {
    await mkdir(join(srcDir, dir), { recursive: true });
    await writeFile(join(srcDir, dir, 'asset.txt'), content);
  }
};

const read = (dir: string) => readFile(join(destDir, dir, 'asset.txt'), 'utf8');
const stamp = () => readFile(join(workDir, PDFJS_STAMP_FILE), 'utf8');
const sync = (
  version: string,
  rename?: (from: string, to: string) => Promise<void>,
) => syncPdfjsAssets({ srcDir, destDir, workDir, version, rename });
const fsError = (code: string) =>
  Object.assign(new Error(`${code}: simulated`), { code });

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pdfjs-assets-'));
  srcDir = join(root, 'pdfjs-dist');
  destDir = join(root, 'public', 'pdfjs');
  workDir = join(root, 'cache');
  await writeSrc('v1');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('syncPdfjsAssets', () => {
  it('copies every asset folder and stamps the version outside the served folder', async () => {
    expect(await sync('1.0.0')).toBe('copied');
    for (const dir of PDFJS_ASSET_DIRS) expect(await read(dir)).toBe('v1');
    expect(await stamp()).toBe('1.0.0');
    // Nothing but the assets lands in public/ (and so in dist/).
    expect(existsSync(join(destDir, '.version'))).toBe(false);
  });

  it('skips the copy when the stamp matches, leaving files untouched', async () => {
    await sync('1.0.0');
    await writeSrc('v1-changed');
    expect(await sync('1.0.0')).toBe('skipped');
    expect(await read('wasm')).toBe('v1');
  });

  it('swaps in a fresh copy when the version changes', async () => {
    await sync('1.0.0');
    await writeFile(join(destDir, 'cmaps', 'stale.txt'), 'old');
    await writeSrc('v2');
    expect(await sync('2.0.0')).toBe('copied');
    expect(await read('cmaps')).toBe('v2');
    expect(existsSync(join(destDir, 'cmaps', 'stale.txt'))).toBe(false);
    expect(await stamp()).toBe('2.0.0');
  });

  it.each(['EBUSY', 'EPERM', 'EACCES'])(
    'overwrites in place when the folder is locked (%s) instead of throwing',
    async (code) => {
      await sync('1.0.0');
      await writeSrc('v2');
      const result = await sync('2.0.0', async () => {
        throw fsError(code);
      });
      expect(result).toBe('copied');
      expect(await read('iccs')).toBe('v2');
      expect(await stamp()).toBe('2.0.0');
    },
  );

  it('rethrows other swap errors and keeps the previous copy and stamp', async () => {
    await sync('1.0.0');
    await writeSrc('v2');
    await expect(
      sync('2.0.0', async () => {
        throw fsError('EIO');
      }),
    ).rejects.toThrow('EIO');
    expect(await read('iccs')).toBe('v1');
    expect(await stamp()).toBe('1.0.0');
    expect(existsSync(workDir)).toBe(true);
  });

  it('re-copies when an asset folder is missing despite a matching stamp', async () => {
    await sync('1.0.0');
    await rm(join(destDir, 'standard_fonts'), { recursive: true });
    expect(await sync('1.0.0')).toBe('copied');
    expect(await read('standard_fonts')).toBe('v1');
  });

  it('sweeps fresh/old folders left by crashed runs, but not live ones', async () => {
    // A pid that cannot be running (above the OS limit) and our own pid.
    const dead = join(workDir, 'fresh-999999999-1');
    const deadOld = join(workDir, 'old-999999999-1');
    const live = join(workDir, `fresh-${process.pid}-1`);
    for (const dir of [dead, deadOld, live])
      await mkdir(dir, { recursive: true });
    await sync('1.0.0');
    expect(existsSync(dead)).toBe(false);
    expect(existsSync(deadOld)).toBe(false);
    expect(existsSync(live)).toBe(true);
  });
});
