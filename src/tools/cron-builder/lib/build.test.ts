import { describe, expect, it } from 'vitest';
import { buildField, fieldToSpec, type FieldSpec } from './build';
import type { CronFlavour, FieldName } from './parse';

describe('buildField', () => {
  it('writes steps in each flavour form', () => {
    const spec: FieldSpec = { mode: 'step', from: 0, step: 15 };
    expect(buildField(spec, 'minute', 'quartz')).toBe('0/15');
    expect(buildField(spec, 'minute', 'unix')).toBe('*/15');
    expect(buildField({ mode: 'step', from: 5, step: 15 }, 'minute')).toBe(
      '5-59/15',
    );
    expect(buildField({ mode: 'step', from: 1, step: 2 }, 'dom')).toBe('*/2');
  });
  it('writes every, specific values and ranges', () => {
    expect(buildField({ mode: 'every' }, 'hour')).toBe('*');
    expect(buildField({ mode: 'specific', values: [5, 1, 5] }, 'dow')).toBe(
      '1,5',
    );
    expect(buildField({ mode: 'specific', values: [] }, 'dow')).toBe('*');
    expect(buildField({ mode: 'range', from: 9, to: 17 }, 'hour')).toBe('9-17');
    expect(
      buildField({ mode: 'range', from: 9, to: 17, step: 2 }, 'hour'),
    ).toBe('9-17/2');
  });
});

describe('fieldToSpec', () => {
  const cases: [FieldSpec, FieldName, CronFlavour][] = [
    [{ mode: 'every' }, 'minute', 'unix'],
    [{ mode: 'specific', values: [0, 30] }, 'minute', 'unix'],
    [{ mode: 'range', from: 1, to: 5 }, 'dow', 'unix'],
    [{ mode: 'range', from: 9, to: 17, step: 2 }, 'hour', 'unix'],
    [{ mode: 'step', from: 0, step: 15 }, 'minute', 'unix'],
    [{ mode: 'step', from: 5, step: 10 }, 'minute', 'unix'],
    [{ mode: 'step', from: 0, step: 15 }, 'second', 'quartz'],
    [{ mode: 'specific', values: [2, 6] }, 'dow', 'quartz'],
  ];
  it.each(cases)('round-trips %j in %s (%s)', (spec, field, flavour) => {
    const text = buildField(spec, field, flavour);
    expect(fieldToSpec(text, field, flavour)).toEqual(spec);
  });
  it('reads names and gives null for mixed forms', () => {
    expect(fieldToSpec('MON-FRI', 'dow')).toEqual({
      mode: 'range',
      from: 1,
      to: 5,
    });
    expect(fieldToSpec('1,5-7', 'dow')).toBeNull();
    expect(fieldToSpec('L', 'dom', 'quartz')).toBeNull();
    expect(() => fieldToSpec('99', 'minute')).toThrow(/out of range/);
  });
});
