import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { LICENCES } from './licences';

/** Packages credited under a display name instead of the package name. */
const CREDITED_AS: Record<string, string> = {
  '@fontsource-variable/inter': 'Inter',
  '@fontsource-variable/jetbrains-mono': 'JetBrains Mono',
};

const ALLOWED =
  /^(MIT|ISC|BSD-[23]-Clause|Apache-2\.0|OFL-1\.1|MPL-2\.0|Zlib|CC-BY-3\.0-US)$/;

/**
 * The packages one entry names: "a, b" lists several, and a bare name after
 * a scoped one shares its scope ("@x/core, language-en").
 */
function packagesOf(name: string): string[] {
  let scope = '';
  return name.split(/,\s*/).map((part) => {
    if (part.startsWith('@')) {
      scope = part.slice(0, part.indexOf('/') + 1);
      return part;
    }
    return scope + part;
  });
}

describe('LICENCES', () => {
  it('credits every runtime dependency', () => {
    const named = new Set(LICENCES.flatMap((e) => packagesOf(e.name)));
    const missing = Object.keys(pkg.dependencies).filter(
      (dep) => !named.has(dep) && !named.has(CREDITED_AS[dep] ?? ''),
    );
    expect(missing).toEqual([]);
  });

  it('uses permissive SPDX licences, https links and unique names', () => {
    for (const e of LICENCES) {
      for (const id of e.licence.split(' AND ')) expect(id).toMatch(ALLOWED);
      expect(e.url).toMatch(/^https:\/\//);
    }
    const names = LICENCES.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
