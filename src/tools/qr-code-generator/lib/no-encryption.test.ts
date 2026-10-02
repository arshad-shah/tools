import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('QR generator has no encryption', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? files(p) : [p];
    });
  it('no source mentions crypto-js or encryption', () => {
    const hits = files('src/tools/qr-code-generator')
      .filter((f) => !f.endsWith('no-encryption.test.ts'))
      .filter((f) => /crypto-js|encrypt/i.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
  it('crypto-js is no longer a dependency', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies['crypto-js']).toBeUndefined();
    expect(pkg.devDependencies['@types/crypto-js']).toBeUndefined();
  });
});
