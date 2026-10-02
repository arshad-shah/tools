import React from 'react';
import { ToolError } from '@/shared/lib/errors';
import { Alert, AlertDescription, ErrorState, Text } from '@/shared/ui';
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
      <ErrorState
        error={TIMEOUT_DETAIL}
        title={TIMEOUT_TITLE}
        actions={[{ label: 'Retry', onClick: onRetry, variant: 'primary' }]}
      />
    );
  if (error)
    return (
      <Alert status="danger">
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  if (pending)
    return (
      <Text size="sm" tone="subtle">
        Running the pattern
      </Text>
    );
  return null;
};
