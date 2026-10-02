import type { Plugin } from 'vite';

/*
 * Content-Security-Policy (decision G11). Scripts, workers, objects and
 * frames are locked to this origin; wasm compiles under 'wasm-unsafe-eval'
 * (pdf.js decoders, qpdf, tesseract). connect-src stays open because the
 * HTTP client tool and the opt-in signing timestamp call user-chosen URLs;
 * the workspace's same-origin rule is enforced by request-log tests and the
 * OCR loader's same-origin guard.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  // sonner and Plotly inject style elements.
  "style-src 'self' 'unsafe-inline'",
  // The Random Data Generator shows remote avatar URLs.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  'connect-src * data: blob:',
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

/** Every response's security headers, as name/value pairs. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** The static-assets `_headers` file (Cloudflare format) for every path. */
export function headersFile(): string {
  const lines = Object.entries(SECURITY_HEADERS).map(
    ([name, value]) => `  ${name}: ${value}`,
  );
  return `/*\n${lines.join('\n')}\n`;
}

/** Emits `_headers` into the client build, next to index.html. */
export function cspHeaders(): Plugin {
  return {
    name: 'csp-headers',
    apply: 'build',
    generateBundle() {
      if (this.environment && this.environment.name !== 'client') return;
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: headersFile(),
      });
    },
  };
}
