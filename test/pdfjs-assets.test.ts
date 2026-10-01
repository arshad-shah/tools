import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PDFJS_ASSET_DIRS, syncPdfjsAssets } from '../scripts/pdfjs-assets.mjs';

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
  it('copies every asset folder and stamps the version', async () => {
    const result = await syncPdfjsAssets({
      srcDir,
      destDir,
      workDir,
      version: '1.0.0',
    });
    expect(result).toBe('copied');
    for (const dir of PDFJS_ASSET_DIRS) expect(await read(dir)).toBe('v1');
    expect(await readFile(join(destDir, '.version'), 'utf8')).toBe('1.0.0');
  });

  it('skips the copy when the stamp matches, leaving files untouched', async () => {
    await syncPdfjsAssets({ srcDir, destDir, workDir, version: '1.0.0' });
    await writeSrc('v1-changed');
    const result = await syncPdfjsAssets({
      srcDir,
      destDir,
      workDir,
      version: '1.0.0',
    });
    expect(result).toBe('skipped');
    expect(await read('wasm')).toBe('v1');
  });

  it('swaps in a fresh copy when the version changes', async () => {
    await syncPdfjsAssets({ srcDir, destDir, workDir, version: '1.0.0' });
    await writeFile(join(destDir, 'cmaps', 'stale.txt'), 'old');
    await writeSrc('v2');
    const result = await syncPdfjsAssets({
      srcDir,
      destDir,
      workDir,
      version: '2.0.0',
    });
    expect(result).toBe('copied');
    expect(await read('cmaps')).toBe('v2');
    expect(existsSync(join(destDir, 'cmaps', 'stale.txt'))).toBe(false);
    expect(await readFile(join(destDir, '.version'), 'utf8')).toBe('2.0.0');
  });

  it('overwrites in place when the folder is busy instead of throwing', async () => {
    await syncPdfjsAssets({ srcDir, destDir, workDir, version: '1.0.0' });
    await writeSrc('v2');
    const busy = Object.assign(new Error('resource busy or locked'), {
      code: 'EBUSY',
    });
    const result = await syncPdfjsAssets({
      srcDir,
      destDir,
      workDir,
      version: '2.0.0',
      rename: async () => {
        throw busy;
      },
    });
    expect(result).toBe('copied');
    expect(await read('iccs')).toBe('v2');
    expect(await readFile(join(destDir, '.version'), 'utf8')).toBe('2.0.0');
  });

  it('re-copies when an asset folder is missing despite a matching stamp', async () => {
    await syncPdfjsAssets({ srcDir, destDir, workDir, version: '1.0.0' });
    await rm(join(destDir, 'standard_fonts'), { recursive: true });
    const result = await syncPdfjsAssets({
      srcDir,
      destDir,
      workDir,
      version: '1.0.0',
    });
    expect(result).toBe('copied');
    expect(await read('standard_fonts')).toBe('v1');
  });
});
