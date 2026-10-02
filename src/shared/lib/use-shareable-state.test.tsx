/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notify } from './notify';
import { encodeShare } from './share-state';
import { useShareableState } from './use-shareable-state';

interface S {
  pattern: string;
}
const parse = (s: unknown): S | null =>
  typeof s === 'object' && s !== null && typeof (s as S).pattern === 'string'
    ? { pattern: (s as S).pattern }
    : null;

const fragmentOf = (state: unknown, version = 1) => {
  const r = encodeShare(state, version);
  if (!r.ok) throw new Error('too large');
  return r.fragment;
};

afterEach(() => window.history.replaceState(null, '', '/'));

describe('useShareableState', () => {
  it('hydrates once from the fragment and removes it', () => {
    window.history.replaceState(
      null,
      '',
      `/text/regex?x=1#${fragmentOf({ pattern: 'a+' })}`,
    );
    const replace = vi.spyOn(window.history, 'replaceState');
    const { result, rerender } = renderHook(() =>
      useShareableState({
        toolId: 'regex-tester',
        version: 1,
        parse,
        select: () => ({ pattern: 'b' }),
      }),
    );
    expect(result.current.loaded).toEqual({ pattern: 'a+' });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe('?x=1');
    rerender();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(result.current.loaded).toEqual({ pattern: 'a+' });
  });

  it('gives loaded null and an error when parse refuses', () => {
    const error = vi.spyOn(notify, 'error').mockImplementation(() => 0);
    window.history.replaceState(null, '', `/x#${fragmentOf({ nope: 1 })}`);
    const { result } = renderHook(() =>
      useShareableState({
        toolId: 'regex-tester',
        version: 1,
        parse,
        select: () => ({ pattern: '' }),
      }),
    );
    expect(result.current.loaded).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('refuses a link from a newer tool version', () => {
    const error = vi.spyOn(notify, 'error').mockImplementation(() => 0);
    window.history.replaceState(
      null,
      '',
      `/x#${fragmentOf({ pattern: 'a' }, 3)}`,
    );
    const { result } = renderHook(() =>
      useShareableState({ toolId: 't', version: 2, parse, select: () => null }),
    );
    expect(result.current.loaded).toBeNull();
    expect(error.mock.calls[0][0]).toMatchObject({
      message: expect.stringMatching(/newer version/),
    });
  });

  it('share() copies <origin><path>#s=...', async () => {
    vi.spyOn(notify, 'success').mockImplementation(() => 0);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    window.history.replaceState(null, '', '/text/regex');
    const { result } = renderHook(() =>
      useShareableState({
        toolId: 'regex-tester',
        version: 1,
        parse,
        select: () => ({ pattern: 'a+' }),
      }),
    );
    expect(result.current.canShare).toBe(true);
    let url = '';
    await act(async () => {
      url = await result.current.share();
    });
    expect(url).toBe(
      `${window.location.origin}/text/regex#${fragmentOf({ pattern: 'a+' })}`,
    );
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it('cannot share big state and says why', async () => {
    const { result } = renderHook(() =>
      useShareableState({
        toolId: 'regex-tester',
        version: 1,
        parse,
        select: () => ({ pattern: 'x'.repeat(70_000) }),
      }),
    );
    expect(result.current.canShare).toBe(false);
    expect(result.current.reason).toMatch(
      /^Too large to share as a link \(\d+ KB\)$/,
    );
    await expect(result.current.share()).rejects.toMatchObject({
      code: 'TOO_LARGE',
    });
  });
});
