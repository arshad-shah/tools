import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { logToolError, toToolError, type ToolError } from '@/shared/lib/errors';

export type JobStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface JobProgress {
  done: number;
  total: number;
  label?: string;
}

export interface JobContext {
  signal: AbortSignal;
  progress(p: JobProgress): void;
}

export interface JobState<R> {
  status: JobStatus;
  progress: JobProgress | null;
  result: R | null;
  error: ToolError | null;
}

const idle = {
  status: 'idle',
  progress: null,
  result: null,
  error: null,
} as const;

/**
 * Runs one async operation at a time with progress, cancellation and typed
 * errors. A new run supersedes the previous one; superseded or cancelled runs
 * never update state.
 */
export function useJob<A extends unknown[], R>(
  fn: (ctx: JobContext, ...args: A) => Promise<R>,
) {
  const [state, setState] = useState<JobState<R>>(idle);
  const fnRef = useRef(fn);
  const runId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  useEffect(
    () => () => {
      controller.current?.abort();
      runId.current++;
    },
    [],
  );

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const id = ++runId.current;
    const isCurrent = () => id === runId.current;
    setState({ status: 'running', progress: null, result: null, error: null });

    try {
      const result = await fnRef.current(
        {
          signal: ctrl.signal,
          progress: (p) => {
            if (isCurrent()) setState((s) => ({ ...s, progress: p }));
          },
        },
        ...args,
      );
      if (!isCurrent()) return undefined;
      controller.current = null;
      setState({ status: 'done', progress: null, result, error: null });
      return result;
    } catch (e) {
      if (!isCurrent()) return undefined;
      controller.current = null;
      const error = toToolError(e);
      if (ctrl.signal.aborted || error.code === 'CANCELLED') {
        setState({ ...idle, status: 'cancelled' });
      } else {
        logToolError(error);
        setState({ status: 'error', progress: null, result: null, error });
      }
      return undefined;
    }
  }, []);

  const cancel = useCallback(() => {
    if (!controller.current) return;
    controller.current.abort();
    controller.current = null;
    runId.current++;
    setState({ ...idle, status: 'cancelled' });
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    runId.current++;
    setState(idle);
  }, []);

  return { ...state, run, cancel, reset };
}
