import { toast } from 'sonner';
import { announce } from './announce';
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

type Show = (
  message: string,
  data?: { action?: NotifyAction; duration?: number },
) => unknown;

const show = (fn: Show, message: string, opts?: NotifyOptions) => {
  const action = opts?.action;
  const data = {
    ...(action
      ? { action: { label: action.label, onClick: () => action.onClick() } }
      : {}),
    ...(opts?.duration !== undefined ? { duration: opts.duration } : {}),
  };
  return Object.keys(data).length ? fn(message, data) : fn(message);
};

/** App-wide toasts. Rendered by the single kit <Toaster/> in App. */
export const notify = {
  success: (message: string, opts?: NotifyOptions) =>
    show(toast.success, message, opts),
  info: (message: string, opts?: NotifyOptions) => show(toast, message, opts),
  /**
   * Sonner announces every toast politely; an error is also announced
   * assertively through the kit announcer (spec §4.6).
   */
  error: (error: string | ToolError, opts?: NotifyOptions) => {
    const message = typeof error === 'string' ? error : error.message;
    announce(message, 'assertive');
    return show(toast.error, message, opts);
  },
};
