import {
  Badge,
  Button,
  Inline,
  ListRow,
  ListRows,
  Menu,
  Notice,
  SegmentedControl,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  copy as copyIcon,
  download as downloadIcon,
  send,
} from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import type { ExecOutcome, StatementResult } from '../lib/engine';
import { MAX_RESULT_ROWS } from '../lib/client';
import { formatMs, plural } from '../lib/results';
import { ResultGrid } from './ResultGrid';

export type ResultAction = 'csv' | 'json' | 'copy' | 'send-csv';

interface ResultsPanelProps {
  outcome: ExecOutcome;
  onAction(action: ResultAction, result: StatementResult): void;
  canSend: boolean;
}

const short = (sql: string) =>
  sql.length > 80 ? `${sql.slice(0, 77).replace(/\s+/g, ' ')}...` : sql;

/** The outcome of a run: the failing statement, then each result set. */
export function ResultsPanel({
  outcome,
  onAction,
  canSend,
}: ResultsPanelProps) {
  const sets = outcome.results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.columns.length > 0);
  const changes = outcome.results.filter((r) => r.columns.length === 0);
  // The last result set is the one shown first, as in most SQL shells.
  const [picked, setPicked] = useState<{ of: ExecOutcome; i: number } | null>(
    null,
  );
  const shown =
    (picked?.of === outcome ? sets.find((s) => s.i === picked.i) : null) ??
    sets[sets.length - 1];

  return (
    <Stack gap="3" as="section" aria-label="Results">
      {outcome.error ? (
        <Notice
          tone="danger"
          title={`Statement ${outcome.error.statement} failed (line ${outcome.error.line})`}
        >
          {outcome.error.message}
        </Notice>
      ) : null}
      <Inline gap="2" align="center" wrap aria-live="polite">
        <Badge size="sm" variant="soft" tone="neutral">
          {`${plural(outcome.results.length, 'statement')} in ${formatMs(outcome.ms)}`}
        </Badge>
        {shown ? (
          <Badge size="sm" variant="soft" tone="accent">
            {plural(shown.r.rows.length, 'row')}
          </Badge>
        ) : null}
        {shown?.r.truncated ? (
          <Badge size="sm" variant="soft" tone="warning">
            {`Only the first ${MAX_RESULT_ROWS.toLocaleString('en-US')} rows are kept`}
          </Badge>
        ) : null}
      </Inline>
      {changes.length > 0 ? (
        <ListRows label="Statements without rows" size="sm" divided>
          {changes.slice(-5).map((r, k) => (
            <ListRow
              key={k}
              label={short(r.sql)}
              mono="description"
              detail={`${plural(r.changes, 'row')} changed, ${formatMs(r.ms)}`}
            />
          ))}
        </ListRows>
      ) : null}
      {changes.length > 5 ? (
        <Text size="sm" tone="muted">
          {`Showing the last 5 of ${changes.length.toLocaleString('en-US')} statements without rows.`}
        </Text>
      ) : null}
      {sets.length > 1 ? (
        <SegmentedControl
          label="Result set"
          size="sm"
          value={String(shown?.i ?? '')}
          onChange={(v) => setPicked({ of: outcome, i: Number(v) })}
          options={sets.map(({ i }, k) => ({
            value: String(i),
            label: `Result ${k + 1}`,
          }))}
        />
      ) : null}
      {shown ? (
        <>
          <Inline gap="2" align="center" justify="between" wrap>
            <Text size="sm" tone="muted" truncate>
              {short(shown.r.sql)}
            </Text>
            <Inline gap="2" wrap>
              <Button
                size="sm"
                variant="ghost"
                icon={copyIcon}
                onClick={() => onAction('copy', shown.r)}
              >
                Copy
              </Button>
              <Menu
                label="Export result"
                items={[
                  { value: 'csv', label: 'CSV file' },
                  { value: 'json', label: 'JSON file' },
                ]}
                onSelect={(v) => onAction(v as ResultAction, shown.r)}
                trigger={(props) => (
                  <Button
                    {...props}
                    size="sm"
                    variant="soft"
                    icon={downloadIcon}
                  >
                    Export
                  </Button>
                )}
              />
              {canSend ? (
                <Button
                  size="sm"
                  variant="soft"
                  icon={send}
                  onClick={() => onAction('send-csv', shown.r)}
                >
                  Send to CSV viewer
                </Button>
              ) : null}
            </Inline>
          </Inline>
          <ResultGrid
            key={`${shown.i}:${outcome.ms}`}
            label={`Result of statement ${shown.i + 1}`}
            columns={shown.r.columns}
            rows={shown.r.rows}
          />
        </>
      ) : null}
    </Stack>
  );
}
