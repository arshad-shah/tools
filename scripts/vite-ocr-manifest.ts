import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { buildOcrManifest } from './copy-ocr-assets.mjs';

const ID = 'virtual:ocr-manifest';
const RESOLVED = `\0${ID}`;

/**
 * `virtual:ocr-manifest`: the OCR asset manifest (paths and exact sizes),
 * built from the installed packages and inlined into the app, so the OCR
 * consent card can name the download size without fetching anything
 * before the person agrees (spec 11).
 */
export function ocrManifest(): Plugin {
  const nodeModules = fileURLToPath(
    new URL('../node_modules/', import.meta.url),
  );
  return {
    name: 'ocr-manifest',
    // Hook filters keep the hooks from running for every other module.
    resolveId: {
      filter: { id: /^virtual:ocr-manifest$/ },
      handler: (id) => (id === ID ? RESOLVED : undefined),
    },
    load: {
      filter: { id: /^\0virtual:ocr-manifest$/ },
      async handler(id) {
        if (id !== RESOLVED) return undefined;
        const manifest = await buildOcrManifest(nodeModules);
        return `export default ${JSON.stringify(manifest)};\n`;
      },
    },
  };
}
