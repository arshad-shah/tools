/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import type { Match } from '../lib/match';

interface Call {
  args: [string, string, string];
  resolve: (m: Match[]) => void;
  reject: (e: unknown) => void;
}

const calls = vi.hoisted(() => [] as Call[]);
const runner = vi.hoisted(() => ({
  match: (pattern: string, flags: string, text: string) =>
    new Promise<Match[]>((resolve, reject) => {
      calls.push({ args: [pattern, flags, text], resolve, reject });
    }),
  dispose: () => {},
}));
import { useRegexMatches } from './useRegexMatches';

const match = (text: string, index = 0): Match => ({
  text,
  index,
  length: text.length,
  groups: null,
  namedGroups: null,
});

type Props = { pattern: string; text: string; valid?: boolean };
const setup = (initial: Props) =>
  renderHook(
    ({ pattern, text, valid }: Props) =>
      useRegexMatches(runner, pattern, 'g', text, { valid }),
    {
      initialProps: initial,
    },
  );

/** Lets the debounce fire so the hook calls the runner. */
const debounce = () => act(() => vi.advanceTimersByTime(150));
/** Settles a runner promise and flushes its then-callback. */
const settle = async (fn: () => void) => {
  await act(async () => {
    fn();
    await Promise.resolve();
  });
};

describe('useRegexMatches', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    calls.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('shows the result for the current input', async () => {
    const { result } = setup({ pattern: 'a', text: 'abc' });
    expect(result.current.matching).toBe(true);
    debounce();
    expect(calls.map((c) => c.args)).toEqual([['a', 'dg', 'abc']]);
    await settle(() => calls[0].resolve([match('a')]));
    expect(result.current.matches).toEqual([match('a')]);
    expect(result.current.hasResult).toBe(true);
    expect(result.current.matching).toBe(false);
  });

  it('drops a stale result that lands after the input changed', async () => {
    const { result, rerender } = setup({ pattern: 'a', text: 'abc' });
    debounce();
    rerender({ pattern: 'b', text: 'abc' });
    debounce();
    expect(calls).toHaveLength(2);
    // The first call resolves late: it must not be shown for the new input.
    await settle(() => calls[0].resolve([match('a')]));
    expect(result.current.matches).toEqual([]);
    expect(result.current.hasResult).toBe(false);
    expect(result.current.matching).toBe(true);
    await settle(() => calls[1].resolve([match('b', 1)]));
    expect(result.current.matches).toEqual([match('b', 1)]);
  });

  it('keeps the previous result hidden once the input moves on', async () => {
    const { result, rerender } = setup({ pattern: 'a', text: 'abc' });
    debounce();
    await settle(() => calls[0].resolve([match('a')]));
    rerender({ pattern: 'c', text: 'abc' });
    expect(result.current.matches).toEqual([]);
    expect(result.current.matching).toBe(true);
  });

  it('does not report CANCELLED (a newer call reports instead)', async () => {
    const { result } = setup({ pattern: 'a', text: 'abc' });
    debounce();
    await settle(() =>
      calls[0].reject(new ToolError('CANCELLED', 'Superseded')),
    );
    expect(result.current.error).toBeNull();
    expect(result.current.hasResult).toBe(false);
  });

  it('does not report a superseded call that fails', async () => {
    const { result, rerender } = setup({ pattern: 'a', text: 'abc' });
    debounce();
    rerender({ pattern: 'b', text: 'abc' });
    await settle(() =>
      calls[0].reject(new ToolError('TIMEOUT', 'Took too long')),
    );
    expect(result.current.error).toBeNull();
  });

  it('reports any other failure of the current call', async () => {
    const { result } = setup({ pattern: 'a', text: 'abc' });
    debounce();
    await settle(() =>
      calls[0].reject(new ToolError('TIMEOUT', 'Took too long')),
    );
    expect(result.current.error?.message).toBe('Took too long');
    expect(result.current.matches).toEqual([]);
    expect(result.current.hasResult).toBe(true);
  });

  it('never calls the runner for an invalid pattern', () => {
    const { result } = setup({ pattern: '(', text: 'abc', valid: false });
    debounce();
    expect(calls).toHaveLength(0);
    expect(result.current.matching).toBe(false);
  });

  it('runs the same input again on retry', async () => {
    const { result } = setup({ pattern: 'a', text: 'abc' });
    debounce();
    await settle(() =>
      calls[0].reject(new ToolError('TIMEOUT', 'Took too long')),
    );
    act(() => result.current.retry());
    expect(result.current.error).toBeNull();
    expect(result.current.matching).toBe(true);
    debounce();
    expect(calls).toHaveLength(2);
    await settle(() => calls[1].resolve([match('a')]));
    expect(result.current.matches).toEqual([match('a')]);
  });
});
