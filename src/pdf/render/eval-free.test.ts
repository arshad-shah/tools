import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

/**
 * Review M5 asked for `isEvalSupported: false` (defence in depth against the
 * CVE-2024-4367 eval path). pdfjs-dist 6 dropped that option because it no
 * longer generates code at all. Fail loudly if an upgrade brings it back, so
 * the option gets set again.
 */
describe('pdf.js bundle', () => {
  it.each(['pdfjs-dist/build/pdf.mjs', 'pdfjs-dist/build/pdf.worker.mjs'])(
    '%s never evaluates generated code',
    (id) => {
      const src = readFileSync(require.resolve(id), 'utf8');
      expect(src).not.toMatch(/new Function\(|\beval\(|isEvalSupported/);
    },
  );
});
