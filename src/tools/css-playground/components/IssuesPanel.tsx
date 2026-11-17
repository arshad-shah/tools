import {
  Badge,
  Button,
  EmptyState,
  Inline,
  SegmentedControl,
  Stack,
  Table,
  Text,
} from '@arshad-shah/cynosure';
import { useState } from 'react';
import type { CssIssue, IssueSeverity } from '../lib/types';

const TONE = { error: 'danger', warning: 'warning', info: 'info' } as const;
const RANK: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };

type Filter = 'all' | IssueSeverity;

/**
 * Problems found by the parser (syntax, repeats, undefined variables) and
 * by this browser (unknown properties, rejected values). A line button
 * moves the editor's caret there.
 */
export function IssuesPanel({
  issues,
  onJump,
}: {
  issues: CssIssue[];
  onJump(line: number, column?: number): void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  if (issues.length === 0)
    return (
      <EmptyState
        size="sm"
        title="No issues found"
        description="The parser and this browser accept every rule."
      />
    );
  const count = (s: IssueSeverity) =>
    issues.filter((i) => i.severity === s).length;
  const rows = issues
    .filter((i) => filter === 'all' || i.severity === filter)
    .sort(
      (a, b) =>
        RANK[a.severity] - RANK[b.severity] || (a.line ?? 0) - (b.line ?? 0),
    );
  return (
    <Stack gap="4">
      <Inline gap="3" align="center" wrap>
        <SegmentedControl
          size="sm"
          label="Show"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          options={[
            { value: 'all', label: `All (${issues.length})` },
            { value: 'error', label: `Errors (${count('error')})` },
            { value: 'warning', label: `Warnings (${count('warning')})` },
            { value: 'info', label: `Suggestions (${count('info')})` },
          ]}
        />
      </Inline>
      <Table
        caption="Issues"
        captionHidden
        size="sm"
        stickyHeader
        getRowId={(i) => i.id}
        rows={rows}
        labels={{ empty: 'Nothing of this kind' }}
        columns={[
          {
            key: 'severity',
            header: 'Kind',
            cell: (i) => (
              <Badge size="sm" tone={TONE[i.severity]}>
                {i.rule}
              </Badge>
            ),
          },
          {
            key: 'message',
            header: 'Issue',
            rowHeader: true,
            cell: (i) => (
              <Text size="sm" wrap="break">
                {i.message}
              </Text>
            ),
          },
          {
            key: 'line',
            header: 'Line',
            align: 'end',
            cell: (i) =>
              i.line ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onJump(i.line!, i.column)}
                >
                  {String(i.line)}
                </Button>
              ) : null,
          },
        ]}
      />
    </Stack>
  );
}
