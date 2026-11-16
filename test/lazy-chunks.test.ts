import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toolRoutes } from './e2e/tool-routes';

/*
 * Start-up guard (spec 12.5), read from a production build: Prettier,
 * zxcvbn, exifr, avif and zxing only ever ship in lazy chunks, never in the
 * app shell or a tool route's static imports. Per-route size budgets were
 * dropped by ruling R40 (bundle size is not a concern).
 * Run `pnpm build` first (CI and the merge gate build before testing).
 */
const DIST = 'dist';
const MANIFEST = join(DIST, '.vite/manifest.json');
const PACKAGES = join(DIST, '.vite/chunk-packages.json');

const LAZY_ONLY = [
  /^prettier$/,
  /^@zxcvbn-ts\//,
  /^exifr$/,
  /^@jsquash\/avif$/,
  /^zxing-wasm$/,
];

interface Chunk {
  file: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
}
type Manifest = Record<string, Chunk>;

const built = existsSync(MANIFEST) && existsSync(PACKAGES);

/** Manifest keys of `key` and everything it imports statically. */
function staticClosure(manifest: Manifest, key: string): Set<string> {
  const seen = new Set<string>();
  const stack = [key];
  while (stack.length) {
    const next = stack.pop()!;
    if (seen.has(next) || !manifest[next]) continue;
    seen.add(next);
    stack.push(...(manifest[next].imports ?? []));
  }
  return seen;
}

describe.skipIf(!built)('lazy-only libraries (spec 12.5)', () => {
  const manifest = built
    ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest)
    : {};
  const packages = built
    ? (JSON.parse(readFileSync(PACKAGES, 'utf8')) as Record<string, string[]>)
    : {};
  const tools = toolRoutes().filter((t) => t.enabled);

  it('builds a lazy chunk for every enabled tool', () => {
    const missing = tools
      .filter((t) => !manifest[`src/tools/${t.folder}/Tool.tsx`])
      .map((t) => t.id);
    expect(missing).toEqual([]);
  });

  it('keeps heavy libraries out of every static import graph', () => {
    const roots = [
      'index.html',
      ...tools.map((t) => `src/tools/${t.folder}/Tool.tsx`),
    ].filter((k) => manifest[k]);
    const leaks: string[] = [];
    for (const root of roots) {
      for (const k of staticClosure(manifest, root)) {
        for (const pkg of packages[manifest[k].file] ?? []) {
          if (LAZY_ONLY.some((re) => re.test(pkg)))
            leaks.push(`${root} -> ${manifest[k].file} (${pkg})`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it('keeps CodeMirror and swift-chart out of the app shell', () => {
    const leaks: string[] = [];
    for (const k of staticClosure(manifest, 'index.html'))
      for (const pkg of packages[manifest[k].file] ?? [])
        if (/^@codemirror\/|^@lezer\/|^@arshad-shah\/swift-chart$/.test(pkg))
          leaks.push(`${manifest[k].file} (${pkg})`);
    expect(leaks).toEqual([]);
  });

  it('loads each CodeMirror language on demand, never with a tool', () => {
    const leaks: string[] = [];
    for (const t of tools) {
      const root = `src/tools/${t.folder}/Tool.tsx`;
      if (!manifest[root]) continue;
      for (const k of staticClosure(manifest, root))
        for (const pkg of packages[manifest[k].file] ?? [])
          if (/^@codemirror\/lang-/.test(pkg)) leaks.push(`${t.id} (${pkg})`);
    }
    expect(leaks).toEqual([]);
    // They exist, as their own chunks.
    const all = Object.values(packages).flat();
    expect(all).toEqual(
      expect.arrayContaining([
        '@codemirror/lang-json',
        '@codemirror/lang-markdown',
      ]),
    );
  });

  it('lists the packages of every emitted chunk', () => {
    // Guards the chunk-packages plugin itself: some chunk must name a
    // package, or the lazy-only check above proves nothing.
    expect(Object.values(packages).some((p) => p.includes('react'))).toBe(true);
  });
});
