import {
  Button,
  Card,
  FileDrop,
  Inline,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { sparkles } from '@arshad-shah/cynosure/icons';
import type { useWorkbook } from '../hooks/useWorkbook';
import { MAX_FILE_BYTES } from '../hooks/useWorkbook';

interface OpenScreenProps {
  job: ReturnType<typeof useWorkbook>['open'];
  onFile(file: File): void;
  onSample(): void;
}

/** Before a workbook is open: a drop zone, progress and errors. */
export function OpenScreen({ job, onFile, onSample }: OpenScreenProps) {
  const running = job.status === 'running';
  return (
    <Card
      as="section"
      title="Workbook"
      headingLevel={2}
      padding="sm"
      actions={
        <Button size="sm" variant="ghost" icon={sparkles} onClick={onSample}>
          Open a sample
        </Button>
      }
    >
      <Stack gap="3">
        <FileDrop
          accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
          maxSize={MAX_FILE_BYTES}
          disabled={running}
          labels={{
            prompt: 'Drop an .xlsx or .xlsm workbook here, or',
            chooseOne: 'Open a workbook',
          }}
          onFiles={(files) => files[0] && onFile(files[0])}
        />
        <Text size="sm" tone="muted">
          The workbook is read on this device. Formulas are shown with the
          values Excel last saved; nothing is recalculated and macros never run.
        </Text>
        {running ? (
          <Inline gap="3" align="center">
            <Text size="sm" tone="muted">
              {job.progress?.label ?? 'Reading'}
            </Text>
            <Button size="sm" variant="ghost" onClick={job.cancel}>
              Cancel
            </Button>
          </Inline>
        ) : null}
        {job.error ? (
          <Notice tone="danger" title="Could not open the workbook">
            {job.error.message}
          </Notice>
        ) : null}
      </Stack>
    </Card>
  );
}
