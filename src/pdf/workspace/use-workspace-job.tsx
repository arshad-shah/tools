import { useCallback, useRef, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import type { JobContext, JobProgress } from '@/shared/state/useJob';
import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ProgressOverlay,
} from '@/shared/ui';

/**
 * One document job at a time behind a ProgressOverlay with Cancel (spec
 * §6.4). `run` resolves null when the user cancels; other failures reject.
 */
export function useWorkspaceJob() {
  const [job, setJob] = useState<{
    title: string;
    progress: JobProgress | null;
  } | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(
    async <R,>(title: string, fn: (ctx: JobContext) => Promise<R>) => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setJob({ title, progress: null });
      try {
        return await fn({
          signal: c.signal,
          progress: (progress) =>
            !c.signal.aborted && setJob({ title, progress }),
        });
      } catch (e) {
        if (c.signal.aborted || toToolError(e).code === 'CANCELLED')
          return null;
        throw toToolError(e);
      } finally {
        if (ctrl.current === c) {
          ctrl.current = null;
          setJob(null);
        }
      }
    },
    [],
  );

  const overlay = (
    <ProgressOverlay
      open={job !== null}
      title={job?.title ?? ''}
      progress={job?.progress ?? null}
      onCancel={() => ctrl.current?.abort()}
    />
  );
  return { run, overlay, running: job !== null };
}

/** A confirm dialog as a promise. */
export function useConfirm() {
  const [ask, setAsk] = useState<{
    message: string;
    resolve(ok: boolean): void;
  } | null>(null);
  const confirm = useCallback(
    (message: string) =>
      new Promise<boolean>((resolve) => setAsk({ message, resolve })),
    [],
  );
  const answer = (ok: boolean) => {
    ask?.resolve(ok);
    setAsk(null);
  };
  const dialog = (
    <Dialog open={ask !== null} onOpenChange={(o) => !o && answer(false)}>
      <DialogHeader>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogDescription>{ask?.message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" onClick={() => answer(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => answer(true)}>
          Continue
        </Button>
      </DialogFooter>
    </Dialog>
  );
  return { confirm, dialog };
}
