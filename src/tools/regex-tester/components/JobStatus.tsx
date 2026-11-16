import React from 'react';
import { ToolError } from '@/shared/lib/errors';
import { Button, Notice, Text } from '@arshad-shah/cynosure';
import { REGEX_TIMEOUT_MS } from '../lib/runner';

export const TIMEOUT_TITLE =
  'Pattern took too long (possible catastrophic backtracking)';

const TIMEOUT_DETAIL = new ToolError(
  'TIMEOUT',
  `It ran for over ${REGEX_TIMEOUT_MS / 1000} s and was stopped. Simplify nested quantifiers such as (a+)+, then try again.`,
);

interface JobStatusProps {
  error: ToolError | null;
  pending: boolean;
  onRetry(): void;
}

/**
 * The worker state of a mode: a timeout as an ErrorState with Retry, any
 * other failure as an alert, and a quiet "Running" line while pending.
 */
export const JobStatus: React.FC<JobStatusProps> = ({
  error,
  pending,
  onRetry,
}) => {
  if (error?.code === 'TIMEOUT')
    return (
      <Notice
        tone="danger"
        title={TIMEOUT_TITLE}
        action={
          <Button size="sm" variant="solid" tone="danger" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        {TIMEOUT_DETAIL.message}
      </Notice>
    );
  if (error) return <Notice tone="danger">{error.message}</Notice>;
  if (pending)
    return (
      <Text size="sm" tone="muted">
        Running the pattern
      </Text>
    );
  return null;
};
