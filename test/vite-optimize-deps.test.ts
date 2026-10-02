import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * The dev server pre-bundles dependencies it finds by scanning from
 * index.html. Packages only a worker imports are invisible to that scan, so
 * the first worker load discovers them and Vite reloads the page, which
 * drops in-memory state such as a Home hand-off (P5-G). Every package a PDF
 * worker graph imports must be listed in optimizeDeps.include.
 */
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');

const IMPORT =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;
const WORKER = /new Worker\(\s*new URL\(\s*['"]([^'"]+)['"]/g;

function resolveFile(from: string, spec: string): string | null {
  const base = spec.startsWith('@/')
    ? join(SRC, spec.slice(2))
    : resolve(dirname(from), spec);
  for (const c of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ])
    if (existsSync(c) && /\.tsx?$/.test(c)) return c;
  return null;
}

function walk(entry: string, bare: Set<string>, seen = new Set<string>()) {
  if (seen.has(entry)) return;
  seen.add(entry);
  const text = readFileSync(entry, 'utf8');
  for (const m of text.matchAll(IMPORT)) {
    const spec = m[1] ?? m[2] ?? m[3];
    // Type-only imports and asset URLs are not bundled dependencies.
    if (!spec || /^(?:import|export)\s+type\s/.test(m[0]) || spec.includes('?'))
      continue;
    if (spec.startsWith('.') || spec.startsWith('@/')) {
      const file = resolveFile(entry, spec);
      if (file) walk(file, bare, seen);
    } else if (!spec.startsWith('node:')) bare.add(spec);
  }
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return sources(p);
    return /\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [p] : [];
  });
}

/** Every PDF module started with `new Worker(new URL(...))` (the workspace). */
function workerEntries(): string[] {
  const out: string[] = [];
  for (const c of sources(join(SRC, 'pdf'))) {
    const text = readFileSync(c, 'utf8');
    for (const m of text.matchAll(WORKER)) {
      const file = resolveFile(c, m[1]);
      if (file) out.push(file);
    }
  }
  return out;
}

const include = (() => {
  const text = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
  const block = /optimizeDeps:\s*{[\s\S]*?include:\s*\[([\s\S]*?)\]/.exec(text);
  return new Set(
    [...(block?.[1] ?? '').matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]),
  );
})();

describe('vite optimizeDeps', () => {
  it('finds the PDF worker entries', () => {
    expect(workerEntries().length).toBeGreaterThan(0);
  });

  it('pre-bundles the pdf.js worker the render worker imports', () => {
    expect(include.has('pdfjs-dist/build/pdf.worker.mjs')).toBe(true);
  });

  it('pre-bundles every package only a PDF worker imports', () => {
    const bare = new Set<string>();
    for (const w of workerEntries()) walk(w, bare);
    const main = new Set<string>();
    walk(join(SRC, 'main.tsx'), main);
    const workerOnly = [...bare].filter((b) => !main.has(b)).sort();
    expect(workerOnly.filter((b) => !include.has(b))).toEqual([]);
  });
});
