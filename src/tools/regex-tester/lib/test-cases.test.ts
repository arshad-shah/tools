import { describe, expect, it, vi } from 'vitest';
import {
  casesFromLines,
  evaluateTestCases,
  linesFromCases,
  runTestCases,
  summarise,
  type TestCase,
} from './test-cases';

const cases: TestCase[] = [
  { text: '2024-01-02', expect: 'match' },
  { text: 'no date', expect: 'no-match' },
  { text: 'nope', expect: 'match' },
  { text: '1999-12-31', expect: 'no-match' },
];

describe('evaluateTestCases', () => {
  it('reports pass and fail with the actual outcome', () => {
    expect(evaluateTestCases('\\d{4}-\\d{2}-\\d{2}', 'g', cases)).toEqual([
      { pass: true, actual: true },
      { pass: true, actual: false },
      { pass: false, actual: false },
      { pass: false, actual: true },
    ]);
  });
  it('does not carry lastIndex between cases', () => {
    const r = evaluateTestCases('a', 'gy', [
      { text: 'a', expect: 'match' },
      { text: 'a', expect: 'match' },
    ]);
    expect(r.every((x) => x.pass)).toBe(true);
  });
  it('summarises', () => {
    const r = evaluateTestCases('\\d', '', cases);
    expect(summarise(r)).toEqual({ passed: 2, failed: 2, total: 4 });
  });
});

describe('runTestCases', () => {
  it('sends the batch to the runner, and skips an empty batch', async () => {
    const tests = vi.fn(async (p: string, f: string, c: TestCase[]) =>
      evaluateTestCases(p, f, c),
    );
    await expect(
      runTestCases({ tests }, '\\d', '', cases),
    ).resolves.toHaveLength(4);
    await expect(runTestCases({ tests }, '\\d', '', [])).resolves.toEqual([]);
    expect(tests).toHaveBeenCalledTimes(1);
  });
});

describe('case lines', () => {
  it('turns non-empty lines into cases and back', () => {
    const c = casesFromLines('a\n\nb', 'c');
    expect(c).toEqual([
      { text: 'a', expect: 'match' },
      { text: 'b', expect: 'match' },
      { text: 'c', expect: 'no-match' },
    ]);
    expect(linesFromCases(c)).toEqual({
      shouldMatch: 'a\nb',
      shouldNotMatch: 'c',
    });
  });
});
