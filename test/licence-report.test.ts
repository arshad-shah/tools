import { describe, expect, it } from 'vitest';
import { licenceAllowed, report } from '../scripts/licence-report';

describe('licence report', () => {
  it.each([
    ['MIT', 'any', true],
    ['(MIT OR CC0-1.0)', 'any', true],
    ['MIT OR GPL-3.0', 'any', true],
    ['(MIT AND Zlib)', 'pako', true],
    ['(MIT AND Zlib)', 'other', false],
    ['MPL-2.0', 'tldts', true],
    ['MPL-2.0', 'axe-core', false],
    ['GPL-3.0', 'any', false],
    ['LGPL-3.0-or-later', 'any', false],
  ])('%s for %s is %s', (expr, name, ok) => {
    expect(licenceAllowed(expr, name)).toBe(ok);
  });

  it('lists each failing package with its versions', () => {
    expect(
      report({
        MIT: [{ name: 'a', versions: ['1.0.0'] }],
        'GPL-2.0': [{ name: 'b', versions: ['2.0.0', '2.1.0'] }],
      }),
    ).toEqual(['b@2.0.0,2.1.0: GPL-2.0']);
  });
});
