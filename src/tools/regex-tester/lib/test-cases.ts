import { compile } from './match';

export interface TestCase {
  text: string;
  expect: 'match' | 'no-match';
}

export interface TestCaseResult {
  pass: boolean;
  /** Whether the pattern matched the case text. */
  actual: boolean;
}

/**
 * Checks each case against the pattern (pure; runs inside the worker). `g`
 * is dropped so lastIndex never carries over between cases.
 */
export function evaluateTestCases(
  pattern: string,
  flags: string,
  cases: TestCase[],
): TestCaseResult[] {
  const regex = compile(pattern, flags.replace('g', ''));
  return cases.map((c) => {
    regex.lastIndex = 0;
    const actual = regex.test(c.text);
    return { actual, pass: actual === (c.expect === 'match') };
  });
}

/** Runs the whole batch in the worker, under the runner's timeout. */
export function runTestCases(
  runner: {
    tests(
      pattern: string,
      flags: string,
      cases: TestCase[],
    ): Promise<TestCaseResult[]>;
  },
  pattern: string,
  flags: string,
  cases: TestCase[],
): Promise<TestCaseResult[]> {
  if (cases.length === 0) return Promise.resolve([]);
  return runner.tests(pattern, flags, cases);
}

/** "3 of 4 passing" style summary counts. */
export function summarise(results: TestCaseResult[]) {
  const passed = results.filter((r) => r.pass).length;
  return { passed, failed: results.length - passed, total: results.length };
}

const lines = (text: string) => text.split('\n').filter((l) => l !== '');

/** Cases from the two line editors: one case per non-empty line. */
export function casesFromLines(
  shouldMatch: string,
  shouldNotMatch: string,
): TestCase[] {
  return [
    ...lines(shouldMatch).map((text) => ({ text, expect: 'match' as const })),
    ...lines(shouldNotMatch).map((text) => ({
      text,
      expect: 'no-match' as const,
    })),
  ];
}

/** The two line editors' text for a list of cases (inverse of casesFromLines). */
export function linesFromCases(cases: TestCase[]): {
  shouldMatch: string;
  shouldNotMatch: string;
} {
  const pick = (e: TestCase['expect']) =>
    cases
      .filter((c) => c.expect === e && !c.text.includes('\n'))
      .map((c) => c.text)
      .join('\n');
  return { shouldMatch: pick('match'), shouldNotMatch: pick('no-match') };
}
