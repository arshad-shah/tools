import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from '@cloudflare/vite-plugin';
import { buildDefines } from './build-info';
import { glyphReport } from './scripts/vite-glyph-report';
import { escapeVendorGlyphs } from './scripts/vite-vendor-glyphs';
import { SECURITY_HEADERS, cspHeaders } from './scripts/csp';
import { chunkPackages } from './scripts/vite-chunk-packages';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    escapeVendorGlyphs(),
    glyphReport(),
    cspHeaders(),
    chunkPackages(),
  ],
  define: buildDefines(),
  // dist/.vite/manifest.json feeds test/bundle-budget.test.ts (spec 12.5);
  // public/.assetsignore keeps it off the deployed site.
  build: { manifest: true },
  // Module workers everywhere: qpdf-wasm's loader uses dynamic import(),
  // which the default IIFE worker format cannot code-split.
  // Worker bundles have their own plugin list: third-party glyph literals
  // (fontkit in the edit worker) are escaped there too.
  worker: { format: 'es', plugins: () => [escapeVendorGlyphs()] },
  // Worker-only dependencies are invisible to the dep scanner; pre-bundle
  // them so the first edit-worker load cannot trigger a re-optimise reload.
  optimizeDeps: { include: ['@pdf-lib/standard-fonts'] },
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
