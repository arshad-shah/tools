import { describe, expect, it } from 'vitest';
import { logFormatPayload, namedGroups, REGEX_MIME } from './log-format';

describe('logFormatPayload', () => {
  it('is offered only for patterns with named groups', () => {
    expect(logFormatPayload('(\\w+) (.*)', 'g')).toBeNull();
    expect(logFormatPayload('(', '')).toBeNull();
    const p = logFormatPayload('(?<level>\\w+) (?<msg>.*)', 'g')!;
    expect(p).toMatchObject({
      kind: 'text',
      mime: REGEX_MIME,
      sourceTool: 'regex-tester',
    });
    expect(JSON.parse((p as { text: string }).text)).toEqual({
      pattern: '(?<level>\\w+) (?<msg>.*)',
      flags: 'g',
    });
    expect(namedGroups('(?<a>x)(?<b>y)', '')).toEqual(['a', 'b']);
  });
});
