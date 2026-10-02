import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import plugin from './index.js';

/*
 * RuleTester applies inline directives before the rule sees them: a blanket
 * `eslint-disable` would silence the rule under test and unknown rule names
 * would add "definition not found" errors. The Linter with `noInlineConfig`
 * hands every directive to the rule as a plain comment instead; only this
 * rule's messages are compared.
 */
const linter = new Linter({ configType: 'flat' });
const config = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    linterOptions: { noInlineConfig: true },
    plugins: { local: plugin },
    rules: { 'local/no-disable-enforced': 'error' },
  },
];
const messageIds = (code) =>
  linter
    .verify(code, config, 'file.ts')
    .filter((m) => m.ruleId === 'local/no-disable-enforced')
    .map((m) => m.messageId);

describe('no-disable-enforced', () => {
  it.each([
    `// eslint-disable-next-line @typescript-eslint/no-explicit-any\nconst a: any = 1;`,
    `/* eslint-disable react-hooks/exhaustive-deps */`,
    `// the word eslint in prose is fine\nconst a = 1;`,
    `const url = 'http://example.com'; // eslint is mentioned`,
  ])('valid: %s', (code) => {
    expect(messageIds(code)).toEqual([]);
  });

  it.each([
    [
      `// eslint-disable-next-line local/no-pictographic-text\nconst a = 1;`,
      'named',
    ],
    [`/* eslint-disable local/no-lucide-outside-icons */`, 'named'],
    [
      `const a = 1; // eslint-disable-line local/no-raw-ui-outside-kit`,
      'named',
    ],
    [
      `/* eslint-disable no-console, local/no-disable-enforced -- reason */`,
      'named',
    ],
    [`/* eslint-enable local/no-pictographic-text */`, 'named'],
    [`/* eslint local/no-pictographic-text: off */`, 'named'],
    [`/* eslint-disable */`, 'blanket'],
    [`// eslint-disable-next-line\nconst a = 1;`, 'blanket'],
    [`const a = 1; // eslint-disable-line`, 'blanket'],
    [`// eslint-disable-next-line -- just because\nconst a = 1;`, 'blanket'],
  ])('invalid: %s', (code, id) => {
    expect(messageIds(code)).toEqual([id]);
  });
});
