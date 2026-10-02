import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

export const SHARE_ALLOWLIST = [
  'regex-tester',
  'text-diff-checker',
  'calculator',
  'number-converter',
  'unit-converter',
  'date-calculator',
  'epoch-converter',
  'cron-builder',
  'color-tester',
  'qr-code-generator',
  'random-data-generator',
  'url-parser',
].sort();

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory()
      ? files(p)
      : /\.(ts|tsx)$/.test(n)
        ? [p]
        : [];
  });
}

describe('share allow-list (spec 4.2)', () => {
  it('only allow-listed tools import useShareableState', () => {
    const users = new Set<string>();
    for (const f of files('src/tools')) {
      if (
        /use-shareable-state|useShareableState/.test(readFileSync(f, 'utf8'))
      ) {
        users.add(f.split(/[\\/]/)[2]);
      }
    }
    for (const u of users) expect(SHARE_ALLOWLIST).toContain(u);
  });
});
