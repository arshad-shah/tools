import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { buildDefines } from './build-info';
import { ocrManifest } from './scripts/vite-ocr-manifest';

// Separate from vite.config.ts so the Cloudflare plugin never runs under test.
export default defineConfig({
  plugins: [react(), ocrManifest()],
  define: buildDefines(),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      'test/**/*.test.ts',
      'eslint-rules/**/*.test.js',
    ],
    exclude: ['test/e2e/**', 'node_modules/**'],
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,
  },
});
