import type { Plugin } from 'vite';

/** Chunk file name to the npm packages bundled into it, sorted. */
export type ChunkPackages = Record<string, string[]>;

export const CHUNK_PACKAGES_FILE = '.vite/chunk-packages.json';

/** The npm package a module id belongs to, or null for app code. */
export function packageOf(id: string): string | null {
  // An asset URL import (`x.wasm?url`) bundles a string, not the package.
  if (id.includes('?url')) return null;
  const path = id.replace(/\\/g, '/');
  const at = path.lastIndexOf('/node_modules/');
  if (at < 0) return null;
  const parts = path.slice(at + '/node_modules/'.length).split('/');
  const name = parts[0]?.startsWith('@')
    ? `${parts[0]}/${parts[1] ?? ''}`
    : parts[0];
  return name || null;
}

/**
 * Writes dist/.vite/chunk-packages.json next to Vite's manifest, so
 * test/bundle-budget.test.ts can prove heavy libraries (Prettier, zxcvbn,
 * exifr, avif, zxing) only ever ship in lazy chunks (spec 12.5).
 */
export function chunkPackages(): Plugin {
  return {
    name: 'chunk-packages',
    apply: 'build',
    generateBundle(_options, bundle) {
      const out: ChunkPackages = {};
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const names = new Set<string>();
        for (const id of chunk.moduleIds) {
          const name = packageOf(id);
          if (name) names.add(name);
        }
        out[chunk.fileName] = [...names].sort();
      }
      this.emitFile({
        type: 'asset',
        fileName: CHUNK_PACKAGES_FILE,
        source: `${JSON.stringify(out, null, 2)}\n`,
      });
    },
  };
}
