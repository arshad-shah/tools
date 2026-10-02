import { describe, expect, it } from 'vitest';
import { logFormatPayload } from '@/tools/regex-tester/lib/log-format';
import { readRegexHandoff } from './handoff';

describe('readRegexHandoff', () => {
  it('reads the Regex Tester payload', () => {
    const p = logFormatPayload('(?<msg>.*)', 'i')!;
    expect(readRegexHandoff(p)).toEqual({
      name: 'From Regex Tester',
      pattern: '(?<msg>.*)',
      flags: 'i',
    });
  });
  it('refuses other payloads', () => {
    expect(
      readRegexHandoff({
        kind: 'text',
        mime: 'text/plain',
        text: 'x',
        sourceTool: 's',
      }),
    ).toBeNull();
    expect(
      readRegexHandoff({
        kind: 'text',
        mime: 'application/vnd.tools.regex+json',
        text: '{',
        sourceTool: 's',
      }),
    ).toBeNull();
  });
});
