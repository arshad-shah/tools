import React from 'react';
import {
  Badge,
  Code,
  CodeSurface,
  Grid,
  Inline,
  List,
  ListItem,
  Stack,
  Text,
} from '@/shared/ui';
import { useRegexJob } from '../hooks/useRegexJob';
import type { RegexRunner } from '../lib/runner';
import {
  runTestCases,
  summarise,
  type TestCase,
  type TestCaseResult,
} from '../lib/test-cases';
import { JobStatus } from './JobStatus';

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
  <Inline gap="2" align="center">
    <Badge variant="soft" tone={r.pass ? 'success' : 'danger'} size="sm">
      {r.pass ? 'Pass' : 'Fail'}
    </Badge>
    <Code className="whitespace-pre-wrap">{c.text}</Code>
    <Text as="span" size="xs" tone="subtle">
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
      <Text size="sm" tone="subtle">
        One case per line. Each line is checked on its own.
      </Text>
      <Grid max={2} gap="3">
        <CodeSurface
          value={shouldMatch}
          onChange={onShouldMatchChange}
          language="plain"
          label="Should match"
          placeholder="Lines the pattern should match"
          minHeight={96}
          maxHeight={240}
        />
        <CodeSurface
          value={shouldNotMatch}
          onChange={onShouldNotMatchChange}
          language="plain"
          label="Should not match"
          placeholder="Lines the pattern should not match"
          minHeight={96}
          maxHeight={240}
        />
      </Grid>
      <JobStatus error={job.error} pending={job.pending} onRetry={job.retry} />
      {sum && (
        <Inline>
          <Badge
            variant="solid"
            tone={sum.failed === 0 ? 'success' : 'danger'}
            size="sm"
          >
            {`${sum.passed} of ${sum.total} passing`}
          </Badge>
        </Inline>
      )}
      {results && results.length === cases.length && (
        <List aria-label="Test results">
          {cases.map((c, i) => (
            <ListItem key={`${c.expect}:${i}`}>
              <Result c={c} r={results[i]} />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
};
