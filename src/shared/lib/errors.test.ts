import { describe, expect, it } from 'vitest';
import { ToolError, toToolError } from './errors';

describe('ToolError', () => {
  it('carries code, message and cause', () => {
    const cause = new Error('low level');
    const err = new ToolError('INVALID_FILE', 'Bad file', { cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ToolError');
    expect(err.code).toBe('INVALID_FILE');
    expect(err.message).toBe('Bad file');
    expect(err.cause).toBe(cause);
  });
});

describe('toToolError', () => {
  it('returns ToolErrors unchanged', () => {
    const err = new ToolError('ENCRYPTED', 'locked');
    expect(toToolError(err)).toBe(err);
  });
  it('maps AbortError to CANCELLED', () => {
    const abort = new DOMException('aborted', 'AbortError');
    expect(toToolError(abort).code).toBe('CANCELLED');
  });
  it('maps any AbortError-named error to CANCELLED', () => {
    const err = Object.assign(new Error('x'), { name: 'AbortError' });
    expect(toToolError(err)).toMatchObject({ code: 'CANCELLED', cause: err });
    expect(toToolError({ name: 'AbortError' }).code).toBe('CANCELLED');
  });
  it('wraps plain errors as UNKNOWN keeping the message', () => {
    const out = toToolError(new Error('boom'));
    expect(out.code).toBe('UNKNOWN');
    expect(out.message).toBe('boom');
  });
  it('uses the fallback for non-errors', () => {
    expect(toToolError('nope', 'Fallback').message).toBe('Fallback');
  });
});
