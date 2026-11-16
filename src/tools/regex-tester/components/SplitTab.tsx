import React from 'react';
import {
  Badge,
  CodeBlock,
  EmptyState,
  Inline,
  Stack,
} from '@arshad-shah/cynosure';
import { useRegexJob } from '../hooks/useRegexJob';
import { plural } from '../lib/plural';
import type { RegexRunner } from '../lib/runner';
import { JobStatus } from './JobStatus';

interface SplitTabProps {
  runner: Pick<RegexRunner, 'split'>;
  pattern: string;
  flags: string;
  text: string;
  valid: boolean;
}

/** `text.split(regex)` as a JSON array preview (captures included). */
export const SplitTab: React.FC<SplitTabProps> = ({
  runner,
  pattern,
  flags,
  text,
  valid,
}) => {
  const key =
    valid && pattern && text ? JSON.stringify([pattern, flags, text]) : null;
  const job = useRegexJob(key, () => runner.split(pattern, flags, text));
  const parts = key === null ? null : (job.value ?? job.last);

  if (key === null)
    return (
      <EmptyState
        size="sm"
        title="Nothing to split"
        description="Enter a pattern and a test string to split the text."
      />
    );
  return (
    <Stack gap="3">
      <JobStatus error={job.error} pending={job.pending} onRetry={job.retry} />
      {job.value && (
        <Inline>
          <Badge tone="accent" size="sm">
            {plural(job.value.length, 'item', 'items')}
          </Badge>
        </Inline>
      )}
      {parts && !job.error ? (
        <CodeBlock
          title="Split result"
          code={JSON.stringify(parts, null, 2)}
          language="json"
          copyable
        />
      ) : null}
    </Stack>
  );
};
