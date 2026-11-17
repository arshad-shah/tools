import {
  Badge,
  Button,
  Dialog,
  Grid,
  Notice,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { useState } from 'react';
import type { CustomFormatDef } from '../lib/custom-format';
import { levelLabel } from '../lib/level-style';
import type { LogEntry } from '../lib/model';
import { rowTime } from '../lib/progress';
import { useFormatTest } from '../hooks/useFormatTest';

export interface CustomFormatDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  initial?: CustomFormatDef;
  /** Up to 20 lines of the current log to test against. */
  sampleLines: readonly string[];
  onSave(def: CustomFormatDef): void;
}

const BLANK: CustomFormatDef = { name: '', pattern: '', flags: '' };

/**
 * Define a log format as a regex with named groups (`ts`, `level`, `msg`,
 * `component`; other groups become fields), tested live against the first
 * lines of the log.
 */
export function CustomFormatDialog(props: CustomFormatDialogProps) {
  return props.open ? <DialogForm {...props} /> : null;
}

function DialogForm({
  onOpenChange,
  initial,
  sampleLines,
  onSave,
}: CustomFormatDialogProps) {
  const [def, setDef] = useState<CustomFormatDef>(initial ?? BLANK);
  const { results, error, running } = useFormatTest(def, sampleLines);
  const matched = results?.filter(Boolean).length ?? 0;
  const set = (patch: Partial<CustomFormatDef>) =>
    setDef((d) => ({ ...d, ...patch }));
  const canSave =
    def.name.trim() !== '' && def.pattern !== '' && !error && !running;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      size="lg"
      title="Custom log format"
      description="A regular expression with named groups ts, level, msg and component; any other named group becomes a field."
      actions={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            disabled={!canSave}
            onClick={() => onSave({ ...def, name: def.name.trim() })}
          >
            Save format
          </Button>
        </>
      }
    >
      <Stack gap="4">
        <Grid columns={{ base: 1, sm: 2 }} gap="3">
          <TextField
            label="Name"
            value={def.name}
            onChange={(name) => set({ name })}
          />
          <TextField
            label="Flags"
            value={def.flags}
            onChange={(flags) =>
              set({ flags: flags.replace(/[^dimsuv]/g, '') })
            }
          />
        </Grid>
        <TextField
          label="Pattern"
          placeholder="(?<ts>\S+) (?<level>\w+) (?<msg>.*)"
          value={def.pattern}
          onChange={(pattern) => set({ pattern })}
          error={
            error
              ? error.code === 'TIMEOUT'
                ? 'Pattern took too long'
                : error.message
              : undefined
          }
        />
        <TestResults
          lines={sampleLines}
          results={def.pattern ? results : null}
          matched={matched}
          running={running}
        />
      </Stack>
    </Dialog>
  );
}

type Result = { line: number; entry: Partial<LogEntry> | null; text: string };

function TestResults({
  lines,
  results,
  matched,
  running,
}: {
  lines: readonly string[];
  results: (Partial<LogEntry> | null)[] | null;
  matched: number;
  running: boolean;
}) {
  if (lines.length === 0)
    return (
      <Notice tone="neutral">
        Open or paste a log to test the pattern against its first lines.
      </Notice>
    );
  const rows: Result[] = (results ?? []).map((entry, i) => ({
    line: i + 1,
    entry,
    text: lines[i] ?? '',
  }));
  return (
    <Stack gap="2">
      <Text size="sm" tone="muted" role="status">
        {running
          ? 'Testing'
          : results
            ? `${matched} of ${lines.length} lines match`
            : `Testing against the first ${lines.length} lines`}
      </Text>
      {results ? (
        <ScrollArea label="Test results">
          <Table<Result>
            caption="Test results"
            captionHidden
            size="sm"
            stickyHeader
            rows={rows}
            getRowId={(r) => String(r.line)}
            columns={[
              {
                key: 'line',
                header: 'Line',
                rowHeader: true,
                cell: (r) => (
                  <Badge size="sm" tone={r.entry ? 'success' : 'neutral'} dot>
                    {`${r.line} ${r.entry ? 'matched' : 'no match'}`}
                  </Badge>
                ),
              },
              {
                key: 'time',
                header: 'Time',
                cell: (r) => (r.entry ? rowTime(r.entry.ts) : ''),
              },
              {
                key: 'level',
                header: 'Level',
                cell: (r) => (r.entry?.level ? levelLabel(r.entry.level) : ''),
              },
              {
                key: 'message',
                header: 'Message',
                cell: (r) => (
                  <Text variant="code" size="xs" truncate>
                    {r.entry ? r.entry.message : r.text}
                  </Text>
                ),
              },
            ]}
          />
        </ScrollArea>
      ) : null}
    </Stack>
  );
}
