import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Bundle split (spec §14, plan G-6). Owner ruling R40: bundle size is not a
 * concern, so no KB budget is asserted; what must hold is that the heavy
 * parts load lazily: the workspace, each mode, tesseract, qpdf and the
 * compression pipeline are separate chunks that the app entry does not pull
 * in on first load. Reads the Vite manifest of a production build
 * (`pnpm build`; CI builds before unit tests); skipped locally without one.
 */
const DIST = 'dist';
const MANIFEST = join(DIST, '.vite', 'manifest.json');
const built = existsSync(MANIFEST);

interface Chunk {
  file: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
}

const manifest: Record<string, Chunk> = built
  ? JSON.parse(readFileSync(MANIFEST, 'utf8'))
  : {};

/** Chunks loaded with the entry: the entry and its static imports. */
function firstLoad(): Set<string> {
  const seen = new Set<string>();
  const stack = Object.keys(manifest).filter((k) => manifest[k]!.isEntry);
  while (stack.length) {
    const k = stack.pop()!;
    if (seen.has(k)) continue;
    seen.add(k);
    stack.push(...(manifest[k]!.imports ?? []));
  }
  return seen;
}

const modeIds = readdirSync('src/pdf/workspace/modes', {
  withFileTypes: true,
})
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((id) => existsSync(`src/pdf/workspace/modes/${id}/Mode.tsx`));

const keyMatching = (re: RegExp) =>
  Object.keys(manifest).find((k) => re.test(k));

describe.skipIf(!built && !process.env.CI)('lazy chunks (spec §14)', () => {
  it('a build with a manifest exists in CI', () => expect(built).toBe(true));

  it('the app has one entry', () => {
    expect(Object.values(manifest).filter((c) => c.isEntry)).toHaveLength(1);
  });

  it('the workspace route is a lazy chunk', () => {
    expect(manifest['src/tools/pdf-edit/Tool.tsx']?.isDynamicEntry).toBe(true);
  });

  it.each(modeIds)('mode %s is its own lazy chunk', (id) => {
    const chunk = manifest[`src/pdf/workspace/modes/${id}/Mode.tsx`];
    expect(chunk?.isDynamicEntry, id).toBe(true);
  });

  it('tesseract and the OCR pool are lazy chunks', () => {
    const tesseract = keyMatching(/node_modules\/.*tesseract\.js\//);
    expect(tesseract).toBeDefined();
    expect(manifest[tesseract!]!.isDynamicEntry).toBe(true);
    expect(manifest['src/pdf/ocr/pool.ts']?.isDynamicEntry).toBe(true);
  });

  it('qpdf and compress run in their own worker bundles', () => {
    const assets = readdirSync(join(DIST, 'assets'));
    expect(assets.some((f) => /^qpdf\.worker-.+\.js$/.test(f))).toBe(true);
    expect(assets.some((f) => /^compress\.worker-.+\.js$/.test(f))).toBe(true);
  });

  it('nothing heavy loads with the entry', () => {
    const first = firstLoad();
    const keys = [...first];
    expect(keys).not.toContain('src/tools/pdf-edit/Tool.tsx');
    for (const id of modeIds)
      expect(keys).not.toContain(`src/pdf/workspace/modes/${id}/Mode.tsx`);
    // The chunks that start the qpdf, compress and OCR workers (or hold
    // tesseract) are reached only through dynamic imports.
    for (const k of keys) {
      const code = readFileSync(join(DIST, manifest[k]!.file), 'utf8');
      for (const marker of ['qpdf.worker', 'compress.worker', 'tesseract'])
        expect(code.includes(marker), `${k} contains ${marker}`).toBe(false);
    }
  });
});
