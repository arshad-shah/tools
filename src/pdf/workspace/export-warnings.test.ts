import { describe, expect, it } from 'vitest';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import { exportWarnings } from './export-warnings';

describe('exportWarnings', () => {
  it('warns that owner restrictions are not kept once unlocked', () => {
    const model = makeModel(
      makeState(2, { restricted: true, ownerRestricted: true }),
    );
    model.unrestrict();
    expect(exportWarnings(model.getState(), model.getView())).toContain(
      'This PDF had owner restrictions. The exported file does not keep them.',
    );
  });

  it('says nothing for an ordinary document', () => {
    const model = makeModel(makeState(2));
    expect(exportWarnings(model.getState(), model.getView())).toEqual([]);
  });
});
