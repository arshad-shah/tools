import React from 'react';
import { Badge, Grid, Inline, List, Stack, Text } from '@arshad-shah/cynosure';

import { useRegexJob } from '../hooks/useRegexJob';
import type { RegexRunner } from '../lib/runner';
import {
  runTestCases,
  summarise,
  type TestCase,
  type TestCaseResult,
} from '../lib/test-cases';
import { JobStatus } from './JobStatus';
import { CodeEditor } from '@/shared/editor';

interface TestsTabProps {
  runner: Pick<RegexRunner, 'tests'>;
  pattern: string;
  flags: string;
  valid: boolean;
  shouldMatch: string;
  shouldNotMatch: string;
  onShouldMatchChange(value: string): void;
  onShouldNotMatchChange(value: string): void;
  cases: TestCase[];
}

const Result: React.FC<{ c: TestCase; r: TestCaseResult }> = ({ c, r }) => (
  <Inline gap="3" align="center" wrap>
    <Badge tone={r.pass ? 'success' : 'danger'} size="sm">
      {r.pass ? 'Pass' : 'Fail'}
    </Badge>
    <Text as="span" variant="code" wrap="pre">
      {c.text}
    </Text>
    <Text as="span" size="xs" tone="muted">
      {c.expect === 'match' ? 'should match' : 'should not match'}
      {r.pass ? '' : r.actual ? ', but matched' : ', but did not match'}
    </Text>
  </Inline>
);

/** Should-match and should-not-match lines, checked in the worker. */
export const TestsTab: React.FC<TestsTabProps> = ({
  runner,
  pattern,
  flags,
  valid,
  shouldMatch,
  shouldNotMatch,
  onShouldMatchChange,
  onShouldNotMatchChange,
  cases,
}) => {
  const key =
    valid && pattern && cases.length > 0
      ? JSON.stringify([pattern, flags, cases])
      : null;
  const job = useRegexJob(key, () =>
    runTestCases(runner, pattern, flags, cases),
  );
  const results = job.value;
  const sum = results ? summarise(results) : null;

  return (
    <Stack gap="3">
      <Text size="sm" tone="muted">
        One case per line. Each line is checked on its own.
      </Text>
      <Grid columns={{ base: 1, md: 2 }} gap="4">
        <CodeEditor
          value={shouldMatch}
          onChange={onShouldMatchChange}
          language="plain"
          aria-label="Should match"
          placeholder="Lines the pattern should match"
          minHeight={96}
          maxHeight={240}
        />
        <CodeEditor
          value={shouldNotMatch}
          onChange={onShouldNotMatchChange}
          language="plain"
          aria-label="Should not match"
          placeholder="Lines the pattern should not match"
          minHeight={96}
          maxHeight={240}
        />
      </Grid>
      <JobStatus error={job.error} pending={job.pending} onRetry={job.retry} />
      {sum ? (
        <Inline>
          <Badge
            variant="solid"
            tone={sum.failed === 0 ? 'success' : 'danger'}
            size="sm"
          >
            {`${sum.passed} of ${sum.total} passing`}
          </Badge>
        </Inline>
      ) : null}
      {results && results.length === cases.length ? (
        <List
          label="Test results"
          marker="none"
          divided
          items={cases.map((c, i) => ({
            id: `${c.expect}:${i}`,
            label: <Result c={c} r={results[i]} />,
          }))}
        />
      ) : null}
    </Stack>
  );
};
