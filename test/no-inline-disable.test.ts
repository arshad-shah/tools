import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const ENFORCED =
  /local\/(no-pictographic-text|no-raw-ui-outside-kit|no-lucide-outside-icons|no-disable-enforced)/;
const COMMENT = /\/\*([\s\S]*?)\*\/|\/\/([^\n]*)/g;

/**
 * A blanket `eslint-disable` would also silence `local/no-disable-enforced`,
 * so this guard reads the sources directly instead of trusting the linter.
 */
function inlineDisableOffenders(file: string, text: string): string[] {
  const offenders: string[] = [];
  for (const m of text.matchAll(COMMENT)) {
    const body = (m[1] ?? m[2] ?? '').trim();
    if (!/^eslint(-disable|-enable)?\b/.test(body)) continue;
    const names = body
      .replace(/^eslint(-disable(-next-line|-line)?|-enable)?/, '')
      .split('--')[0]
      .trim();
    if (ENFORCED.test(body) || (/^eslint-disable/.test(body) && names === ''))
      offenders.push(`${file}: ${body}`);
  }
  return offenders;
}

describe('no inline disables of enforced rules', () => {
  it('detects named and blanket directives', () => {
    expect(
      inlineDisableOffenders('x.ts', '/* eslint-disable */\nconst a = 1;'),
    ).toHaveLength(1);
    expect(
      inlineDisableOffenders(
        'x.ts',
        '// eslint-disable-next-line local/no-pictographic-text\n',
      ),
    ).toHaveLength(1);
    expect(
      inlineDisableOffenders(
        'x.ts',
        '// eslint-disable-next-line react-hooks/exhaustive-deps\n',
      ),
    ).toEqual([]);
  });

  it('src has none, named or blanket', () => {
    const offenders = walk('src')
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .flatMap((file) =>
        inlineDisableOffenders(file, readFileSync(file, 'utf8')),
      );
    expect(offenders).toEqual([]);
  });
});
