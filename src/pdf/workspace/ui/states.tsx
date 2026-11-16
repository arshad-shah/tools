import {
  Button,
  Inline,
  LoadingDots,
  Notice,
  ProgressBar,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import type { ToolError } from '@/shared/lib/errors';

/** Titles by error code (the message says what happened). */
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

export interface ErrorAction {
  label: string;
  onClick(): void;
  primary?: boolean;
}

/**
 * A ToolError next to what caused it (redesign spec): a danger Notice with
 * a title by code, the error's own message and the recovery actions.
 */
export function ErrorNotice({
  error,
  title,
  actions,
}: {
  error: ToolError;
  title?: string;
  actions?: ErrorAction[];
}) {
  return (
    <Notice
      tone="danger"
      title={title ?? TITLE[error.code] ?? 'Something went wrong'}
      action={
        actions?.length ? (
          <Inline gap="2" wrap>
            {actions.map((a) => (
              <Button
                key={a.label}
                size="sm"
                variant={a.primary ? 'solid' : 'outline'}
                tone={a.primary ? 'accent' : 'neutral'}
                onClick={a.onClick}
              >
                {a.label}
              </Button>
            ))}
          </Inline>
        ) : undefined
      }
    >
      {error.message}
    </Notice>
  );
}

/** A polite "working" line, or a progress bar when progress is known. */
export function LoadingLine({
  label,
  progress,
}: {
  label: string;
  progress?: { done: number; total: number } | null;
}) {
  if (progress)
    return (
      <Stack gap="2" role="status">
        <ProgressBar
          label={label}
          value={progress.done}
          max={Math.max(1, progress.total)}
          showValue
        />
      </Stack>
    );
  return (
    <Inline gap="3" align="center" role="status" aria-live="polite">
      <LoadingDots size="sm" tone="muted" />
      <Text size="sm" tone="muted">
        {label}
      </Text>
    </Inline>
  );
}
