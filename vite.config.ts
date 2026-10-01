import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from '@cloudflare/vite-plugin';
import { buildDefines } from './build-info';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  define: buildDefines(),
  // Module workers everywhere: qpdf-wasm's loader uses dynamic import(),
  // which the default IIFE worker format cannot code-split.
  worker: { format: 'es' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Static pdf.js assets, (re)written by scripts/copy-pdfjs-assets.mjs.
    // Watching them lets a parallel copy crash this server with EBUSY on Windows.
    watch: { ignored: ['**/public/pdfjs/**'] },
  },
});
