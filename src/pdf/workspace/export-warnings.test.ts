import { beforeAll, describe, expect, it } from 'vitest';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import { DEFAULT_PERMISSIONS } from '@/pdf/edit/permissions';
import { exportWarnings } from './export-warnings';

beforeAll(() => registerCoreOperations());

const UNPROTECTED =
  'This document was opened with a password. The exported file is not password-protected.';

describe('exportWarnings', () => {
  it('warns that an encrypted input is exported without a password', () => {
    const m = makeModel(makeState(1, { encryptedInput: true }));
    expect(exportWarnings(m.getState(), m.getView())).toEqual([UNPROTECTED]);
  });

  it('says nothing while password protection is on, and again when it is off', () => {
    const m = makeModel(makeState(1, { encryptedInput: true }));
    const set = (enabled: boolean) =>
      m.dispatch({
        type: 'protect.set',
        params: { enabled, permissions: DEFAULT_PERMISSIONS },
      });
    set(true);
    expect(exportWarnings(m.getState(), m.getView())).toEqual([]);
    set(false);
    expect(exportWarnings(m.getState(), m.getView())).toEqual([UNPROTECTED]);
  });

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
