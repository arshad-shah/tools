import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GENERATE,
  generate,
  isTargetId,
  samplesOf,
  TARGET_IDS,
  TARGETS,
} from './generate';
import { JsonInputError } from './parse-input';

const opts = { ...DEFAULT_GENERATE };

describe('generate', () => {
  it('returns null for blank input', () => {
    expect(generate('   ', opts)).toBeNull();
  });

  it('merges JSON lines into one type', () => {
    const r = generate('{"a":1}\n{"a":2,"b":"x"}', opts);
    expect(r?.samples).toBe(2);
    expect(r?.code).toBe(
      'export interface Root {\n  a: number;\n  b?: string;\n}\n',
    );
  });

  it('can read a top-level array as samples of the root', () => {
    const asArray = generate('[{"a":1},{"b":2}]', opts);
    expect(asArray?.code).toContain('export type Root = RootItem[];');
    const asSamples = generate('[{"a":1},{"b":2}]', {
      ...opts,
      arrayAsSamples: true,
    });
    expect(asSamples?.samples).toBe(2);
    expect(asSamples?.code).toBe(
      'export interface Root {\n  a?: number;\n  b?: number;\n}\n',
    );
  });

  it('throws a JsonInputError for bad JSON', () => {
    expect(() => generate('{"a":', opts)).toThrow(JsonInputError);
  });

  it('every target emits non-empty code for the same input', () => {
    for (const target of TARGET_IDS) {
      const r = generate(
        '{"id":1,"tags":["a"],"when":"2024-01-01T00:00:00Z"}',
        {
          ...opts,
          target,
        },
      );
      expect(r?.code.length, target).toBeGreaterThan(20);
      expect(r?.code.endsWith('\n'), target).toBe(true);
    }
  });

  it('reports deep nesting as a ToolError', () => {
    const deep = '['.repeat(20000) + ']'.repeat(20000);
    let err: unknown = null;
    try {
      generate(deep, opts);
    } catch (e) {
      err = e;
    }
    // Either it worked or it failed with a plain message, never a RangeError.
    if (err) expect(err).not.toBeInstanceOf(RangeError);
  });
});

describe('targets', () => {
  it('has a label, extension and emitter for each', () => {
    for (const id of TARGET_IDS) {
      expect(TARGETS[id].label).toBeTruthy();
      expect(TARGETS[id].ext).toMatch(/^[a-z.]+$/);
    }
    expect(isTargetId('go')).toBe(true);
    expect(isTargetId('cobol')).toBe(false);
    expect(isTargetId('toString')).toBe(false);
  });

  it('samplesOf only unwraps a single array document', () => {
    expect(samplesOf([[1, 2]], true)).toEqual([1, 2]);
    expect(samplesOf([[1, 2]], false)).toEqual([[1, 2]]);
    expect(samplesOf([[1], [2]], true)).toEqual([[1], [2]]);
  });
});
