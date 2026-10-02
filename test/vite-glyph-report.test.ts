import { describe, expect, it } from 'vitest';
import { scanModuleText } from '../scripts/vite-glyph-report';

const ARROW = String.fromCodePoint(0x2192);
const SMILE = String.fromCodePoint(0x1f642);
// "~" stands for one backslash, so no escape here is cooked before the test.
const BS = String.fromCharCode(92);
const src = (s: string) => s.replaceAll('~', BS);
const points = (code: string) => scanModuleText(code).map((h) => h.codePoint);

describe('scanModuleText', () => {
  it('finds a banned glyph in a string literal, at the literal', () => {
    expect(scanModuleText(`const a = "${ARROW}";`)).toEqual([
      { offset: 10, codePoint: 'U+2192' },
    ]);
  });

  it('reports every hit, astral code points included', () => {
    expect(points(`a("${SMILE}"); b("${ARROW}x${ARROW}");`)).toEqual([
      'U+1F642',
      'U+2192',
      'U+2192',
    ]);
  });

  it('ignores block and line comments', () => {
    expect(scanModuleText(`/* ${ARROW} */ const a = 1;`)).toEqual([]);
    expect(scanModuleText(`const a = 1; // ${ARROW}\n`)).toEqual([]);
  });

  it('a string containing a comment opener hides nothing after it', () => {
    expect(
      points(`const a = "image/*"; const b = "${ARROW}"; /* x */ const c = 1;`),
    ).toEqual(['U+2192']);
    expect(points(`const re = /a\\/\\/b/; const b = "${ARROW}";`)).toEqual([
      'U+2192',
    ]);
    expect(points(`const u = "https://x.test/${ARROW}";`)).toEqual(['U+2192']);
  });

  it('reads cooked values: string, template and regex escapes', () => {
    expect(points(src('const a = "~u2192";'))).toEqual(['U+2192']);
    expect(points(src('const a = `x ~u{1F642} ${y}`;'))).toEqual(['U+1F642']);
    expect(points(src('const a = /[~u2190-~u21ff]/u;'))).toEqual([
      'U+2190',
      'U+21FF',
    ]);
    expect(points(src('const a = /menu2190/; const b = /~~u2190/;'))).toEqual(
      [],
    );
  });

  it('plain text and allowed punctuation pass', () => {
    expect(
      scanModuleText(
        `const a = "Page 1 of 3 ${String.fromCodePoint(0x2014, 0x20, 0xe9, 0x20, 0x2026)}";`,
      ),
    ).toEqual([]);
  });

  it('a module that does not parse is an error, not a silent pass', () => {
    expect(() => scanModuleText('const = ;')).toThrow();
  });
});
