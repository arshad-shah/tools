import React, { useMemo } from 'react';
import type { ToolError } from '@/shared/lib/errors';
import {
  Alert,
  AlertDescription,
  Badge,
  CodeSurface,
  Inline,
  Stack,
  Text,
  type CodeRange,
} from '@/shared/ui';
import { matchCoverage } from '../lib/coverage';
import { plural } from '../lib/plural';
import type { Match } from '../lib/match';
import { JobStatus } from './JobStatus';
import { MatchList } from './MatchList';

interface MatchTabProps {
  text: string;
  matches: Match[];
  error: ToolError | null;
  pending: boolean;
  hasResult: boolean;
  onRetry(): void;
  /** Capture group picked in Explain: its spans are highlighted. */
  group: number | null;
  onCopy(text: string): void;
}

/** Highlighted test text, counts, coverage and the match list. */
export const MatchTab: React.FC<MatchTabProps> = ({
  text,
  matches,
  error,
  pending,
  hasResult,
  onRetry,
  group,
  onCopy,
}) => {
  const ranges = useMemo<CodeRange[]>(() => {
    const out: CodeRange[] = [];
    for (const m of matches) {
      if (m.length > 0)
        out.push({ start: m.index, end: m.index + m.length, kind: 'match' });
      const span = group !== null ? m.spans?.[group - 1] : null;
      if (span && span[1] > span[0])
        out.push({ start: span[0], end: span[1], kind: 'match-active' });
    }
    return out;
  }, [matches, group]);
  const coverage = matchCoverage(text, matches);

  if (!text)
    return (
      <Text size="sm" tone="subtle">
        Enter a test string to see matches.
      </Text>
    );

  return (
    <Stack gap="3">
      <Inline gap="2" align="center" wrap>
        <Badge variant="solid" tone="accent" size="sm">
          {plural(matches.length, 'match')}
        </Badge>
        {matches.length > 0 && (
          <Badge variant="soft" tone="neutral" size="sm">
            {coverage}% coverage
          </Badge>
        )}
        {group !== null && (
          <Badge variant="outline" tone="accent" size="sm">
            Showing group {group}
          </Badge>
        )}
      </Inline>
      <JobStatus error={error} pending={pending} onRetry={onRetry} />
      <CodeSurface
        value={text}
        language="plain"
        label="Live preview"
        readOnly
        wrap
        ranges={ranges}
        maxHeight={320}
      />
      {hasResult && !error && matches.length === 0 && (
        <Alert status="warning">
          <AlertDescription>
            No matches. Try adjusting the pattern, the flags or the test string.
          </AlertDescription>
        </Alert>
      )}
      {matches.length > 0 && <MatchList matches={matches} onCopy={onCopy} />}
    </Stack>
  );
};
