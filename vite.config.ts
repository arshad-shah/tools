import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';

import { cloudflare } from '@cloudflare/vite-plugin';
import { buildDefines } from './build-info';
import { glyphReport } from './scripts/vite-glyph-report';
import { escapeVendorGlyphs } from './scripts/vite-vendor-glyphs';
import { SECURITY_HEADERS, cspHeaders } from './scripts/csp';
import { chunkPackages } from './scripts/vite-chunk-packages';
import { ocrManifest } from './scripts/vite-ocr-manifest';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    escapeVendorGlyphs(),
    glyphReport(),
    cspHeaders(),
    chunkPackages(),
    ocrManifest(),
  ],
  define: buildDefines(),
  // dist/.vite/manifest.json feeds test/bundle-budget.test.ts (spec 12.5)
  // and test/bundle-size.test.ts (the lazy chunk split, spec 14);
  // public/.assetsignore keeps it off the deployed site.
  build: { manifest: true },
  // Module workers everywhere: qpdf-wasm's loader uses dynamic import(),
  // which the default IIFE worker format cannot code-split.
  // Worker bundles have their own plugin list: third-party glyph literals
  // (fontkit in the edit worker) are escaped there too.
  worker: { format: 'es', plugins: () => [escapeVendorGlyphs()] },
  // Worker-only dependencies are invisible to the dep scanner; pre-bundle
  // them so the first worker load cannot trigger a re-optimise reload (which
  // drops in-memory state such as a Home or hub hand-off). test/vite-optimize-deps
  // keeps this list complete for every worker.
  optimizeDeps: {
    include: [
      '@pdf-lib/standard-fonts',
      'pdfjs-dist/build/pdf.worker.mjs',
      '@arshad-shah/qpdf-wasm',
      // Packages of the other workers (images, text, data, hashes).
      '@jsquash/avif/encode.js',
      '@noble/hashes/argon2.js',
      '@noble/hashes/blake2.js',
      '@noble/hashes/blake3.js',
      '@noble/hashes/hmac.js',
      '@noble/hashes/legacy.js',
      '@noble/hashes/sha3.js',
      '@noble/hashes/utils.js',
      'csso',
      'diff',
      'papaparse',
      'prettier/plugins/babel',
      'prettier/plugins/estree',
      'prettier/plugins/graphql',
      'prettier/plugins/html',
      'prettier/plugins/markdown',
      'prettier/plugins/postcss',
      'prettier/plugins/typescript',
      'prettier/plugins/yaml',
      'prettier/standalone',
      'sql-formatter',
      'sql.js',
      'terser',
      'upng-js',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Static pdf.js assets, (re)written by scripts/copy-pdfjs-assets.mjs.
    // Watching them lets a parallel copy crash this server with EBUSY on Windows.
    watch: { ignored: ['**/public/pdfjs/**', '**/public/ocr/**'] },
  },
  // The deployed headers (public _headers), so the CSP e2e runs on preview.
  preview: { headers: { ...SECURITY_HEADERS } },
});
