import { describe, expect, it } from 'vitest';
import {
  allOperations,
  defineOperation,
  getOperation,
  registerOperations,
} from './registry';

const def = () =>
  defineOperation<{ n: number }>({
    type: 'test.reg',
    v: 1,
    kind: 'overlay',
    mode: 'edit',
    label: (p) => `Test ${p.n}`,
    validate: (p) => p as { n: number },
    applyToView: (v) => v,
  });

describe('op registry', () => {
  it('registering the same definition twice is a no-op', () => {
    const d = def();
    registerOperations([d]);
    registerOperations([d]);
    expect(getOperation('test.reg')).toBe(d);
    expect(allOperations().filter((o) => o.type === 'test.reg')).toHaveLength(
      1,
    );
  });

  it('a different definition for the same type throws', () => {
    registerOperations([def()].slice(0, 0));
    expect(() => registerOperations([def()])).toThrow(/test.reg/);
  });

  it('an unknown type is INVALID_INPUT', () => {
    expect(() => getOperation('nope')).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'This document uses an edit this version does not know (nope)',
      }),
    );
  });
});
