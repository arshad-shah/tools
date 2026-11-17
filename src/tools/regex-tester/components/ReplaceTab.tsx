import React from 'react';
import { Badge, CodeBlock, Inline, Stack, Text } from '@arshad-shah/cynosure';

import { useRegexJob } from '../hooks/useRegexJob';
import { plural } from '../lib/plural';
import type { RegexRunner } from '../lib/runner';
import { JobStatus } from './JobStatus';
import { CodeEditor } from '@/shared/editor';

interface ReplaceTabProps {
  runner: Pick<RegexRunner, 'replace'>;
  pattern: string;
  flags: string;
  text: string;
  valid: boolean;
  replacement: string;
  onReplacementChange(value: string): void;
}

const TOKENS: [string, string][] = [
  ['$1', 'group 1'],
  ['$<name>', 'named group'],
  ['$&', 'whole match'],
  ['$$', 'a literal dollar sign'],
];

/** Replacement template and the live output, run in the worker. */
export const ReplaceTab: React.FC<ReplaceTabProps> = ({
  runner,
  pattern,
  flags,
  text,
  valid,
  replacement,
  onReplacementChange,
}) => {
  const key =
    valid && pattern && text
      ? JSON.stringify([pattern, flags, text, replacement])
      : null;
  const job = useRegexJob(key, () =>
    runner.replace(pattern, flags, text, replacement),
  );
  const shown = key === null ? null : (job.value ?? job.last);

  return (
    <Stack gap="3">
      <CodeEditor
        value={replacement}
        onChange={onReplacementChange}
        language="plain"
        aria-label="Replacement"
        singleLine
        placeholder="Replacement text, for example $1"
      />
      <Inline gap="3" wrap>
        {TOKENS.map(([token, meaning]) => (
          <Text as="span" size="xs" tone="muted" key={token}>
            <Text as="span" variant="code">
              {token}
            </Text>{' '}
            {meaning}
          </Text>
        ))}
      </Inline>
      <JobStatus error={job.error} pending={job.pending} onRetry={job.retry} />
      {job.value ? (
        <Inline>
          <Badge tone="accent" size="sm">
            {plural(job.value.count, 'replacement', 'replacements')}
          </Badge>
        </Inline>
      ) : null}
      {!job.error ? (
        <CodeBlock
          title="Replace result"
          code={shown?.output || 'The replaced text appears here'}
          wrap
          copyable={!!shown?.output}
        />
      ) : null}
    </Stack>
  );
};
