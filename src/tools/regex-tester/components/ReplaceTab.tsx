import React from 'react';
import {
  Badge,
  Code,
  CodeSurface,
  Inline,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';
import { useRegexJob } from '../hooks/useRegexJob';
import { plural } from '../lib/plural';
import type { RegexRunner } from '../lib/runner';
import { JobStatus } from './JobStatus';

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

const NOOP = () => {};

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
      <CodeSurface
        value={replacement}
        onChange={onReplacementChange}
        language="plain"
        label="Replacement"
        singleLine
        placeholder="Replacement text, for example $1"
      />
      <Inline gap="3" wrap>
        {TOKENS.map(([token, meaning]) => (
          <Text as="span" size="xs" tone="subtle" key={token}>
            <Code>{token}</Code> {meaning}
          </Text>
        ))}
      </Inline>
      <JobStatus error={job.error} pending={job.pending} onRetry={job.retry} />
      {job.value && (
        <Inline>
          <Badge variant="soft" tone="accent" size="sm">
            {plural(job.value.count, 'replacement', 'replacements')}
          </Badge>
        </Inline>
      )}
      {!job.error && (
        <TextInputPanel
          value={shown?.output ?? ''}
          onChange={NOOP}
          language="plain"
          label="Replace result"
          readOnly
          wrap
          minHeight={120}
          placeholder="The replaced text appears here"
        />
      )}
    </Stack>
  );
};
