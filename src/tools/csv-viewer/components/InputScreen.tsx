import {
  Button,
  ErrorState,
  Inline,
  Progress,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';
import { IconTable } from '@/shared/ui/icons';
import type { useCsvTable } from '../hooks/useCsvTable';
import { SAMPLES } from '../lib/samples';

const MAX_BYTES = 200 * 1024 * 1024;
const TEXT_MIMES = ['text/csv', 'text/tab-separated-values', 'text/plain'];

interface InputScreenProps {
  paste: string;
  onPasteChange(v: string): void;
  onOpenText(): void;
  onFile(file: File): void;
  job: ReturnType<typeof useCsvTable>['job'];
}

/** Before a table is open: paste, sample, file or drop, then progress. */
export function InputScreen({
  paste,
  onPasteChange,
  onOpenText,
  onFile,
  job,
}: InputScreenProps) {
  const running = job.status === 'running';
  const progress = job.status === 'running' ? job.progress : null;
  return (
    <Stack gap="4">
      <TextInputPanel
        label="CSV or TSV data"
        value={paste}
        onChange={onPasteChange}
        language="csv"
        samples={SAMPLES}
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
        maxBytes={MAX_BYTES}
        handoff={(p) => p.kind === 'text' && TEXT_MIMES.includes(p.mime)}
        onFile={(file) => {
          onFile(file);
          return true;
        }}
        placeholder="Paste rows copied from a spreadsheet, or open or drop a CSV or TSV file"
        minHeight={240}
      />
      <Inline gap="3" align="center" wrap>
        <Button
          size="sm"
          variant="primary"
          onClick={onOpenText}
          disabled={!paste.trim() || running}
          leftIcon={<IconTable size="sm" />}
        >
          Open as table
        </Button>
        {running && (
          <>
            <Text size="sm" tone="subtle">
              {progress?.label ?? 'Reading'}
            </Text>
            {progress && (
              <Progress
                className="w-48"
                value={progress.done}
                max={progress.total}
                label="Loading progress"
              />
            )}
            <Button size="sm" variant="ghost" onClick={job.cancel}>
              Cancel
            </Button>
          </>
        )}
      </Inline>
      {job.error && (
        <ErrorState title="Could not read the data" error={job.error} />
      )}
    </Stack>
  );
}
