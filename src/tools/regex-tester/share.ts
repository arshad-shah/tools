import { REGEX_MODES, type RegexMode } from './settings';
import type { TestCase } from './lib/test-cases';

export const REGEX_SHARE_VERSION = 1;

export interface RegexShare {
  v: 1;
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
  mode: RegexMode;
  cases: TestCase[];
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isCase = (v: unknown): v is TestCase =>
  typeof v === 'object' &&
  v !== null &&
  isString((v as TestCase).text) &&
  ((v as TestCase).expect === 'match' || (v as TestCase).expect === 'no-match');

/** Validates a shared Regex Tester state (spec §4.2); null when it does not fit. */
export function parseRegexShare(state: unknown): RegexShare | null {
  if (typeof state !== 'object' || state === null) return null;
  const s = state as Record<string, unknown>;
  if (s.v !== 1) return null;
  if (
    !isString(s.pattern) ||
    !isString(s.flags) ||
    !/^[dgimsuvy]*$/.test(s.flags) ||
    !isString(s.text) ||
    !isString(s.replacement) ||
    !REGEX_MODES.includes(s.mode as RegexMode) ||
    !Array.isArray(s.cases) ||
    !s.cases.every(isCase)
  )
    return null;
  return {
    v: 1,
    pattern: s.pattern,
    flags: s.flags,
    text: s.text,
    replacement: s.replacement,
    mode: s.mode as RegexMode,
    cases: s.cases.map((c: TestCase) => ({ text: c.text, expect: c.expect })),
  };
}
