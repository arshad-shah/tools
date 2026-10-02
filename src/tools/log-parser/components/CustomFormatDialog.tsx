import { useId, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';
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
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange} size="lg">
      {props.open ? <DialogForm {...props} /> : null}
    </Dialog>
  );
}

function DialogForm({
  onOpenChange,
  initial,
  sampleLines,
  onSave,
}: CustomFormatDialogProps) {
  const [def, setDef] = useState<CustomFormatDef>(initial ?? BLANK);
  const ids = { name: useId(), pattern: useId(), flags: useId() };
  const { results, error, running } = useFormatTest(def, sampleLines);
  const matched = results?.filter(Boolean).length ?? 0;
  const set = (patch: Partial<CustomFormatDef>) =>
    setDef((d) => ({ ...d, ...patch }));
  const canSave =
    def.name.trim() !== '' && def.pattern !== '' && !error && !running;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Custom log format</DialogTitle>
        <DialogDescription>
          A regular expression with named groups ts, level, msg and component;
          any other named group becomes a field.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <div className="flex flex-col gap-1">
            <Label htmlFor={ids.name}>Name</Label>
            <Input
              id={ids.name}
              value={def.name}
              onChange={(name) => set({ name })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={ids.flags}>Flags</Label>
            <Input
              id={ids.flags}
              className="font-mono"
              value={def.flags}
              onChange={(flags) =>
                set({ flags: flags.replace(/[^dimsuv]/g, '') })
              }
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={ids.pattern}>Pattern</Label>
          <Input
            id={ids.pattern}
            className="font-mono"
            invalid={!!error}
            placeholder="(?<ts>\S+) (?<level>\w+) (?<msg>.*)"
            value={def.pattern}
            onChange={(pattern) => set({ pattern })}
          />
        </div>
        {error ? (
          <Alert
            status="danger"
            className="p-3 text-sm"
            data-error-code={error.code}
          >
            {error.code === 'TIMEOUT' ? 'Pattern took too long' : error.message}
          </Alert>
        ) : null}
        <TestResults
          lines={sampleLines}
          results={def.pattern ? results : null}
          matched={matched}
          running={running}
        />
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!canSave}
          onClick={() => onSave({ ...def, name: def.name.trim() })}
        >
          Save format
        </Button>
      </DialogFooter>
    </>
  );
}

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
      <p className="text-sm text-fg-muted">
        Open or paste a log to test the pattern against its first lines.
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="text-sm text-fg-muted">
        {running
          ? 'Testing'
          : results
            ? `${matched} of ${lines.length} lines match`
            : `Testing against the first ${lines.length} lines`}
      </p>
      {results ? (
        <div className="max-h-64 overflow-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Line</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono">
                    <span className="flex items-center gap-1.5">
                      <StatusDot
                        tone={r ? 'accent' : 'muted'}
                        label={r ? 'Matched' : 'No match'}
                      />
                      {i + 1}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">
                    {r ? rowTime(r.ts) : ''}
                  </TableCell>
                  <TableCell>{r?.level ? levelLabel(r.level) : ''}</TableCell>
                  <TableCell className="max-w-96 truncate font-mono">
                    {r ? r.message : lines[i]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
