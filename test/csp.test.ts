import { describe, expect, it } from 'vitest';
import { CSP, SECURITY_HEADERS, headersFile } from '../scripts/csp';

const directives = new Map(
  CSP.split('; ').map((d) => {
    const [name, ...values] = d.split(' ');
    return [name, values] as const;
  }),
);

describe('CSP', () => {
  it('locks scripts to this origin with wasm compilation and no eval', () => {
    expect(directives.get('script-src')).toEqual([
      "'self'",
      "'wasm-unsafe-eval'",
    ]);
    expect(CSP).not.toContain("'unsafe-eval'");
    expect(directives.get('default-src')).toEqual(["'self'"]);
  });

  it('allows same-origin and blob workers only', () => {
    expect(directives.get('worker-src')).toEqual(["'self'", 'blob:']);
  });

  it('forbids plugins, framing and foreign base URLs', () => {
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
    expect(directives.get('base-uri')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'self'"]);
  });

  it('keeps connect-src open for user-chosen URLs (decision G11)', () => {
    expect(directives.get('connect-src')).toEqual(['*', 'data:', 'blob:']);
  });

  it('writes a Cloudflare _headers file for every path', () => {
    const text = headersFile();
    expect(text.startsWith('/*\n')).toBe(true);
    expect(text).toContain(`  Content-Security-Policy: ${CSP}\n`);
    expect(text).toContain('  X-Content-Type-Options: nosniff\n');
    expect(text).toContain('  Referrer-Policy: no-referrer\n');
    expect(text.trimEnd().split('\n')).toHaveLength(
      1 + Object.keys(SECURITY_HEADERS).length,
    );
  });
});
