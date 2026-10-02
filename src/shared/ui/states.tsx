import type { ToolError } from '@/shared/lib/errors';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { Progress } from './controls';
import { IconAlertCircle } from './icons';
import { Spinner } from './spinner';

export {
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateActions,
} from './empty-state';

/** Titles by error code; codes added by later Parts are listed already. */
const TITLE: Record<string, string> = {
  INVALID_FILE: 'This file could not be opened',
  ENCRYPTED: 'Password needed',
  TOO_LARGE: 'File too large',
  WORKER_CRASHED: 'Something stopped working',
  STORAGE_FULL: 'Storage is full',
  VERIFICATION_FAILED: 'Verification failed',
  NETWORK: 'Download failed',
  CERTIFICATE_INVALID: 'Certificate problem',
  SIGNATURE_INVALID: 'Signature check failed',
};

export interface ErrorStateProps {
  error: ToolError;
  title?: string;
  actions?: {
    label: string;
    onClick(): void;
    variant?: 'primary' | 'secondary';
  }[];
  /** Heading level of the title; default 3. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/** A ToolError as a state: title by code, the error's own message, recovery actions. */
export function ErrorState({
  error,
  title,
  actions,
  headingLevel = 3,
  className,
}: ErrorStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-10 text-center shadow-e1',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <IconAlertCircle size="lg" />
      </span>
      <Heading className="text-lg font-semibold text-fg">
        {title ?? TITLE[error.code] ?? 'Something went wrong'}
      </Heading>
      <p className="max-w-md text-sm text-fg-muted">{error.message}</p>
      {actions?.length ? (
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {actions.map((a) => (
            <Button
              key={a.label}
              variant={a.variant ?? 'secondary'}
              onClick={a.onClick}
            >
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
ErrorState.displayName = 'ErrorState';

export interface LoadingStateProps {
  label: string;
  progress?: { done: number; total: number };
  className?: string;
}

/** Polite live status with a spinner, or a progress bar when progress is known. */
export function LoadingState({
  label,
  progress,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center gap-3 px-6 py-10 text-center',
        className,
      )}
    >
      {progress ? (
        <div className="w-full max-w-xs">
          <Progress
            value={progress.done}
            max={Math.max(1, progress.total)}
            label={label}
          />
        </div>
      ) : (
        <Spinner size="lg" decorative />
      )}
      <p className="text-sm text-fg-muted">
        {label}
        {progress ? (
          <span className="ml-2 font-mono-meta text-fg-subtle">
            {progress.done} of {progress.total}
          </span>
        ) : null}
      </p>
    </div>
  );
}
LoadingState.displayName = 'LoadingState';
