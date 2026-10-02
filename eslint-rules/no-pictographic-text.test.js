import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import rule from './no-pictographic-text.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ARROW = String.fromCodePoint(0x2192);
const STAR = String.fromCodePoint(0x2605);
const SMILE = String.fromCodePoint(0x1f642);
const BULLET = String.fromCodePoint(0x2022);
const CHECK = String.fromCodePoint(0x2713);
const COPY = String.fromCodePoint(0xa9);
const FLAG = String.fromCodePoint(0x1f1ee, 0x1f1ea);

// Escape cases must reach the linter as escapes (a backslash and "u..."),
// never as cooked characters. `src` builds a source string in which every
// "~" stands for one backslash, so no escape in this file can be cooked by
// a transform before the test runs.
const BS = String.fromCharCode(92);
const src = (s) => s.replaceAll('~', BS);

describe('test sources', () => {
  it('escape cases reach the linter as escapes', () => {
    const code = src("'~u2192'");
    expect(code).toHaveLength(8);
    expect(code.includes(ARROW)).toBe(false);
  });
});

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const err = (cp) => ({ messageId: 'banned', data: { cp } });

tester.run('no-pictographic-text', rule, {
  valid: [
    { code: `const a = 'Next page';` },
    { code: `const a = \`Page \${n} of \${total}\`;` },
    { code: `const a = <p>Saved, 3 files</p>;` },
    { code: `const a = String.fromCodePoint(0x2610);` },
    { code: `const a = 0x2192;` },
    { code: `// comment with ${ARROW} is not checked\nconst a = 1;` },
    { code: `/* ${STAR} */ const a = 1;` },
    // e-acute, ellipsis, em dash, degree: allowed, escaped and raw
    { code: src("const a = 'caf~u00e9 ~u2026 ~u2014 ~u00b0';") },
    {
      code: `const b = '${String.fromCodePoint(0xe9, 0x20, 0x2026, 0x20, 0x2014)}';`,
    },
    { code: src('const a = /~p{Extended_Pictographic}/u;') }, // property escape
    { code: `const a = '1 # 2 * 3';` }, // ASCII Emoji-but-not-presentation
    { code: 'const a = /menu2190/;' }, // the letters u2190, no escape
    { code: src('const a = /~~u2190/;') }, // escaped backslash, then u2190
    { code: src('const a = /~~u{1F642}/u;') },
    { code: src("const a = '~~u2192';") }, // string: escaped backslash
  ],
  invalid: [
    { code: `const a = 'Next ${ARROW}';`, errors: [err('U+2192')] },
    { code: `const a = <p>${STAR} Favourite</p>;`, errors: [err('U+2605')] },
    {
      code: `const a = <Button label="${CHECK} Copied" />;`,
      errors: [err('U+2713')],
    },
    { code: `const a = \`Done \${x} ${SMILE}\`;`, errors: [err('U+1F642')] },
    { code: `const a = <li>{'${BULLET}'} item</li>;`, errors: [err('U+2022')] },
    { code: `const a = <p>{year} ${COPY}</p>;`, errors: [err('U+00A9')] },
    { code: `const a = '${FLAG}';`, errors: [err('U+1F1EE')] },
    // Cooked values (G2): escapes in every literal kind.
    { code: src("const a = '~u2192';"), errors: [err('U+2192')] },
    { code: src('const a = "~u{1F642}";'), errors: [err('U+1F642')] },
    { code: src("const a = '~ud83d~ude42';"), errors: [err('U+1F642')] },
    { code: src("const a = '~x41~u2190';"), errors: [err('U+2190')] },
    { code: src('const a = `~u2192`;'), errors: [err('U+2192')] },
    { code: src("const a = <p>{'~u2192'}</p>;"), errors: [err('U+2192')] },
    { code: `const a = <p>&rarr; next</p>;`, errors: [err('U+2192')] }, // JSX entity
    { code: `const a = <p title="&bull; x" />;`, errors: [err('U+2022')] },
    { code: `const a = /[${ARROW}]/;`, errors: [err('U+2192')] },
    // Regex escapes.
    { code: src('const a = /[~u2190-~u21ff]/u;'), errors: [err('U+2190')] },
    { code: src('const a = /~u{1F642}/u;'), errors: [err('U+1F642')] },
    { code: src('const a = /x~~~u2192/;'), errors: [err('U+2192')] }, // an escaped backslash, then a real escape
    { code: `it('moves 1 ${ARROW} 2', () => {});`, errors: [err('U+2192')] },
  ],
});
