import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from '@cloudflare/vite-plugin';
import { buildDefines } from './build-info';
import { glyphReport } from './scripts/vite-glyph-report';
import { escapeVendorGlyphs } from './scripts/vite-vendor-glyphs';
import { SECURITY_HEADERS, cspHeaders } from './scripts/csp';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    escapeVendorGlyphs(),
    glyphReport(),
    cspHeaders(),
  ],
  define: buildDefines(),
  // Module workers everywhere: qpdf-wasm's loader uses dynamic import(),
  // which the default IIFE worker format cannot code-split.
  // Worker bundles have their own plugin list: third-party glyph literals
  // (fontkit in the edit worker) are escaped there too.
  worker: { format: 'es', plugins: () => [escapeVendorGlyphs()] },
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
