import { describe, expect, it } from 'vitest';
import * as detect from './index';
import { detectPage } from './index';
import { geometry, gridSegs, rowBaseline, run } from './test-helpers';

describe('detectPage', () => {
  it('reports a page over the path-op budget as skipped', () => {
    const geom = {
      ...geometry({}),
      opCount: 20_001,
      skipped: 'too-complex' as const,
    };
    const result = detectPage(geom, 4);
    expect(result).toMatchObject({
      pageIndex: 4,
      fields: [],
      skipped: 'too-complex',
    });
    expect(result.ms).toBeGreaterThanOrEqual(0);
  });

  it('runs lines, cells and classification on one page', () => {
    const result = detectPage(
      geometry({
        segments: gridSegs([50, 210, 550], [600, 622, 644]),
        runs: [
          run('Surname', 54, rowBaseline(622, 22)),
          run('Email', 54, rowBaseline(600, 22)),
        ],
      }),
      0,
    );
    expect(result.skipped).toBeNull();
    expect(result.fields.map((f) => [f.label, f.autofill])).toEqual([
      ['Surname', 'surname'],
      ['Email', 'email'],
    ]);
    expect(result.ms).toBeGreaterThanOrEqual(0);
  });

  it('exposes the public API from the barrel', () => {
    expect(Object.keys(detect).sort()).toEqual(
      [
        'AUTOFILL_DICTIONARY',
        'FIELD_MIN',
        'MAX_PATH_OPS',
        'SUGGEST_MIN',
        'autofillKey',
        'buildCells',
        'classify',
        'confidence',
        'dedupeAgainstWidgets',
        'detectPage',
        'extractGeometry',
        'findSignTargets',
        'isFlatForm',
        'medianLineHeight',
        'normaliseLines',
        'readingOrder',
        'SIGN_LABELS',
        'sigFieldTargets',
      ].sort(),
    );
  });
});
