import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { classifyFetchError, networkFailureKind } from './errors';

const PAGE = 'https://tools.test';

describe('classifyFetchError', () => {
  it('a cross-origin TypeError is NETWORK with the cause kept', () => {
    const cause = new TypeError('Failed to fetch');
    const e = classifyFetchError(cause, 'https://api.other.test/x', PAGE);
    expect(e).toBeInstanceOf(ToolError);
    expect(e.code).toBe('NETWORK');
    expect(e.message).toBe('The browser blocked or could not reach this URL');
    expect(e.cause).toBe(cause);
    expect(networkFailureKind('https://api.other.test/x', PAGE)).toBe(
      'cross-origin',
    );
  });
  it('http from an https page is mixed content', () => {
    const e = classifyFetchError(
      new TypeError('Failed to fetch'),
      'http://api.other.test/x',
      PAGE,
    );
    expect(e.code).toBe('NETWORK');
    expect(e.message).toMatch(/mixed content/i);
    expect(networkFailureKind('http://localhost:3000/', PAGE)).toBe(
      'cross-origin',
    );
  });
  it('a bad URL is INVALID_INPUT', () => {
    const e = classifyFetchError(
      new TypeError('Invalid URL'),
      'ht tp:/x',
      PAGE,
    );
    expect(e.code).toBe('INVALID_INPUT');
  });
  it('abort is CANCELLED and timeout is TIMEOUT', () => {
    expect(
      classifyFetchError(new DOMException('x', 'AbortError'), PAGE, PAGE).code,
    ).toBe('CANCELLED');
    const t = classifyFetchError(
      new DOMException('x', 'TimeoutError'),
      PAGE,
      PAGE,
      { timeoutMs: 5000 },
    );
    expect(t.code).toBe('TIMEOUT');
    expect(t.message).toBe('No response within 5 s');
  });
  it('passes a ToolError through', () => {
    const e = new ToolError('INVALID_INPUT', 'x');
    expect(classifyFetchError(e, PAGE, PAGE)).toBe(e);
  });
});
