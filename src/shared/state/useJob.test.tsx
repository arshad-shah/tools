/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { useJob, type JobContext } from './useJob';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useJob', () => {
  it('runs to done with result and progress', async () => {
    const d = deferred<number>();
    const { result } = renderHook(() =>
      useJob(async (ctx: JobContext, x: number) => {
        ctx.progress({ done: 1, total: 2, label: 'half' });
        return (await d.promise) * x;
      }),
    );
    let pending!: Promise<number | undefined>;
    act(() => {
      pending = result.current.run(3);
    });
    expect(result.current.status).toBe('running');
    expect(result.current.progress).toEqual({
      done: 1,
      total: 2,
      label: 'half',
    });
    await act(async () => {
      d.resolve(2);
      await pending;
    });
    expect(result.current.status).toBe('done');
    expect(result.current.result).toBe(6);
    expect(result.current.progress).toBeNull();
  });

  it('maps thrown errors to ToolError', async () => {
    const { result } = renderHook(() =>
      useJob(async () => {
        throw new ToolError('INVALID_INPUT', 'bad range');
      }),
    );
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error?.code).toBe('INVALID_INPUT');
  });

  it('logs the underlying cause to the console in dev', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const inner = new Error('pdf.js parse failure');
    const { result } = renderHook(() =>
      useJob(async () => {
        throw new ToolError('INVALID_FILE', 'Could not read', { cause: inner });
      }),
    );
    await act(async () => {
      await result.current.run();
    });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Could not read'),
      inner,
    );
  });

  it('cancel aborts the signal, ignores the late result, and reports cancelled', async () => {
    const d = deferred<string>();
    let seen: AbortSignal | undefined;
    const { result } = renderHook(() =>
      useJob(async (ctx: JobContext) => {
        seen = ctx.signal;
        return d.promise;
      }),
    );
    let pending!: Promise<string | undefined>;
    act(() => {
      pending = result.current.run();
    });
    act(() => result.current.cancel());
    expect(seen?.aborted).toBe(true);
    expect(result.current.status).toBe('cancelled');
    await act(async () => {
      d.resolve('late');
      await pending;
    });
    expect(result.current.status).toBe('cancelled');
    expect(result.current.result).toBeNull();
  });

  it('a second run supersedes the first', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const queue = [first, second];
    const { result } = renderHook(() =>
      useJob(async () => queue.shift()!.promise),
    );
    let p1!: Promise<string | undefined>;
    let p2!: Promise<string | undefined>;
    act(() => {
      p1 = result.current.run();
    });
    act(() => {
      p2 = result.current.run();
    });
    await act(async () => {
      second.resolve('two');
      first.resolve('one');
      await Promise.all([p1, p2]);
    });
    expect(result.current.result).toBe('two');
  });

  it('ignores progress reported after the run settled', async () => {
    let late!: JobContext;
    const { result } = renderHook(() =>
      useJob(async (ctx: JobContext) => {
        late = ctx;
        return 'ok';
      }),
    );
    await act(async () => {
      await result.current.run();
    });
    act(() => late.progress({ done: 1, total: 2 }));
    expect(result.current.status).toBe('done');
    expect(result.current.progress).toBeNull();
  });

  it('reset() returns to idle and drops a late result', async () => {
    const d = deferred<string>();
    const { result } = renderHook(() => useJob(async () => d.promise));
    let pending!: Promise<string | undefined>;
    act(() => {
      pending = result.current.run();
    });
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    await act(async () => {
      d.resolve('late');
      await pending;
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('treats a thrown CANCELLED ToolError (no abort) as cancelled', async () => {
    const { result } = renderHook(() =>
      useJob(async () => {
        throw new ToolError('CANCELLED', 'Stopped');
      }),
    );
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.status).toBe('cancelled');
    expect(result.current.error).toBeNull();
  });

  it('does not update state when a run resolves after unmount', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const d = deferred<string>();
    const { result, unmount } = renderHook(() => useJob(async () => d.promise));
    let pending!: Promise<string | undefined>;
    act(() => {
      pending = result.current.run();
    });
    const before = result.current;
    unmount();
    await act(async () => {
      d.resolve('late');
      expect(await pending).toBeUndefined();
    });
    expect(result.current).toBe(before);
    expect(spy).not.toHaveBeenCalled();
  });

  it('aborts on unmount', () => {
    let seen: AbortSignal | undefined;
    const { result, unmount } = renderHook(() =>
      useJob(async (ctx: JobContext) => {
        seen = ctx.signal;
        return new Promise<void>(() => {});
      }),
    );
    act(() => {
      void result.current.run();
    });
    unmount();
    expect(seen?.aborted).toBe(true);
  });
});
