import { describe, expect, it } from 'vitest';
import { confidence, FIELD_MIN, SUGGEST_MIN } from './confidence';

const none = {
  exact: false,
  hasLabel: false,
  plausible: false,
  peers: 0,
  inHeaderRow: true,
};

describe('confidence', () => {
  it('weights the spec features', () => {
    expect(
      confidence({
        exact: true,
        hasLabel: true,
        plausible: true,
        peers: 2,
        inHeaderRow: false,
      }),
    ).toBe(1);
    expect(confidence(none)).toBe(0);
    expect(confidence({ ...none, exact: true, hasLabel: true })).toBe(0.6);
    expect(confidence({ ...none, plausible: true })).toBe(0.15);
    expect(confidence({ ...none, peers: 1 })).toBe(0);
    expect(confidence({ ...none, peers: 5 })).toBe(0.15);
    expect(confidence({ ...none, inHeaderRow: false })).toBe(0.1);
  });

  it('has the spec thresholds', () => {
    expect(FIELD_MIN).toBe(0.7);
    expect(SUGGEST_MIN).toBe(0.45);
  });
});
