import type { ToastApi, ToastOptions } from '@arshad-shah/cynosure';
import { ToolError } from './errors';

/** A toast action, e.g. "Undo" or "Open in workspace". */
export interface NotifyAction {
  label: string;
  onClick(): void;
}

interface NotifyOptions {
  action?: NotifyAction;
  /** Milliseconds on screen; Infinity keeps it until dismissed. */
  duration?: number;
}

/*
 * The mounted Toaster's API, set by its bridge (src/shared/ui/toaster.tsx).
 * Toasts raised before it mounts wait in `pending` and show when it does.
 */
let api: ToastApi | null = null;
let pending: ToastOptions[] = [];

/** Called by the Toaster's bridge on mount (with its API) and unmount (null). */
export function connectToaster(next: ToastApi | null): void {
  api = next;
  if (!api) return;
  const queued = pending;
  pending = [];
  for (const options of queued) api.toast(options);
}

const show = (
  tone: ToastOptions['tone'],
  title: string,
  opts?: NotifyOptions,
): void => {
  const action = opts?.action;
  let id: string | undefined;
  const options: ToastOptions = {
    title,
    tone,
    ...(opts?.duration !== undefined ? { duration: opts.duration } : {}),
  };
  if (action)
    options.action = {
      label: action.label,
      // As before (sonner): the action runs once and closes its toast.
      onClick: () => {
        action.onClick();
        if (id !== undefined) api?.dismiss(id);
      },
    };
  if (api) id = api.toast(options);
  else {
    id = `notify-${Math.random().toString(36).slice(2)}`;
    options.id = id;
    pending.push(options);
  }
};

/**
 * App-wide toasts, drawn by the single kit <Toaster/> in App through
 * Cynosure. Errors are announced assertively by Cynosure's alert toast.
 */
export const notify = {
  success: (message: string, opts?: NotifyOptions) =>
    show('success', message, opts),
  info: (message: string, opts?: NotifyOptions) =>
    show('neutral', message, opts),
  error: (error: string | ToolError, opts?: NotifyOptions) =>
    show('danger', typeof error === 'string' ? error : error.message, opts),
};

/** Test seam: forget the connected Toaster and anything queued. */
export function resetNotifyForTests(): void {
  api = null;
  pending = [];
}
