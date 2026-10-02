import { describe, expect, it } from 'vitest';
import { EMOJI_ONLY_RE } from '../eslint-rules/banned-glyphs.js';
import {
  escapeGlyphLiterals,
  escapeVendorGlyphs,
  isVendorScript,
  rewriteGlyphLiterals,
} from '../scripts/vite-vendor-glyphs';

const POO = String.fromCodePoint(0x1f4a9);
const WATCH = String.fromCodePoint(0x231a);
// "~" stands for one backslash, so no escape here is cooked before the test.
const BS = String.fromCharCode(92);
const src = (s: string) => s.replaceAll('~', BS);

/** Evaluates a script body that assigns `out`. */
const run = (code: string): unknown =>
  new Function(`${code}; return out;`)() as unknown;

describe('escapeGlyphLiterals', () => {
  it('rewrites a raw glyph in a string literal, keeping the value', () => {
    const code = `const out = "a${POO}b";`;
    const out = escapeGlyphLiterals(code);
    expect(EMOJI_ONLY_RE.test(out)).toBe(false);
    expect(out).toContain('String.fromCodePoint(0x1f4a9)');
    expect(run(out)).toBe(`a${POO}b`);
  });

  it('rewrites escaped glyphs the minifier would print raw', () => {
    const code = src('const out = "x~u231Ay~ud83d~udca9";');
    const out = escapeGlyphLiterals(code);
    expect(out.includes(src('~u231'))).toBe(false);
    expect(run(out)).toBe(`x${WATCH}y${POO}`);
  });

  it('keeps automatic semicolon insertion: never joins the previous line', () => {
    const code = `var b = "B"; var out = b\n"${POO}".length`;
    expect(run(code)).toBe('B');
    const out = escapeGlyphLiterals(code);
    expect(EMOJI_ONLY_RE.test(out)).toBe(false);
    expect(run(out)).toBe('B');
  });

  it('a glyph-first value still starts with a string literal', () => {
    const out = escapeGlyphLiterals(`const out = "${POO}".length;`);
    expect(out).toMatch(/= ""\.concat\(/);
    expect(run(out)).toBe(2);
  });

  it('turns an object key into a computed key', () => {
    const out = escapeGlyphLiterals(`const out = { "${POO}": 1 };`);
    expect(run(out)).toEqual({ [POO]: 1 });
  });

  it('rewrites untagged template text, escaping template syntax', () => {
    const code = src('const n = 2; const out = `${n} ~` ~${x} ' + POO + '`;');
    const out = escapeGlyphLiterals(code);
    expect(EMOJI_ONLY_RE.test(out)).toBe(false);
    expect(run(out)).toBe(`2 \` \${x} ${POO}`);
  });

  it('leaves what it cannot rewrite safely for the dist scan to report', () => {
    const cases = [
      `const out = String.raw\`${POO}\`;`, // tagged template
      `'use ${POO}'; const out = 1;`, // directive
      `const out = /${POO}/u;`, // regex literal
      `import x from "./${POO}.js";`, // module specifier
      `export { x as "${POO}" } from "./y.js";`, // string export name
      `import { "${POO}" as y } from "./y.js";`, // string import name
      `export * as "${POO}" from "./y.js";`,
    ];
    for (const code of cases) expect(escapeGlyphLiterals(code)).toBe(code);
  });

  it('leaves plain code untouched', () => {
    const plain = src('const out = "caf~u00e9 ~u2014";');
    expect(escapeGlyphLiterals(plain)).toBe(plain);
  });

  it('returns a sourcemap for the rewrite', () => {
    const result = rewriteGlyphLiterals(`const out = "${POO}";`, 'v.js');
    expect(result?.map.mappings.length).toBeGreaterThan(0);
    expect(result?.map.sources).toEqual(['v.js']);
  });
});

describe('escapeVendorGlyphs plugin', () => {
  const transform = escapeVendorGlyphs().transform as (
    code: string,
    id: string,
  ) => unknown;
  const code = `const out = "${POO}";`;

  it('only touches JavaScript under node_modules', () => {
    expect(isVendorScript('/repo/node_modules/x/index.mjs')).toBe(true);
    expect(isVendorScript('C:/repo/node_modules/x/a.cjs?v=1')).toBe(true);
    expect(isVendorScript('/repo/src/app/App.tsx')).toBe(false);
    expect(isVendorScript('/repo/node_modules/x/a.ts')).toBe(false);
    expect(transform(code, '/repo/src/a.js')).toBeNull();
    expect(transform(code, '/repo/node_modules/x/a.ts')).toBeNull();
    expect(transform(code, '/repo/node_modules/x/a.js')).not.toBeNull();
  });
});
