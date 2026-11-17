import {
  Button,
  Card,
  FileDrop,
  Inline,
  Menu,
  Notice,
  ProgressBar,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { sparkles, table as tableIcon } from '@arshad-shah/cynosure/icons';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { formatBytes } from '@/shared/lib/format';
import { useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import type { useCsvTable } from '../hooks/useCsvTable';
import { SAMPLES } from '../lib/samples';
import { CodeEditor } from '@/shared/editor';

const MAX_BYTES = 200 * 1024 * 1024;
const TEXT_MIMES = ['text/csv', 'text/tab-separated-values', 'text/plain'];
const isCsvText = (p: HandoffPayload) =>
  p.kind === 'text' && TEXT_MIMES.includes(p.mime);

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
  const [fileError, setFileError] = useState<string | null>(null);

  // CSV text handed over (Send to) opens like a paste. Delivered from an
  // effect: the paste updates the parent, which must not happen while this
  // component renders.
  const handed = useHandoff(isCsvText);
  const taken = useRef<HandoffPayload | null>(null);
  const deliver = useEffectEvent((text: string) => onPasteChange(text));
  useEffect(() => {
    if (!handed || taken.current === handed) return;
    taken.current = handed;
    if (handed.kind === 'text') deliver(handed.text);
  }, [handed]);

  const open = (file: File) => {
    setFileError(null);
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      setFileError(
        `${file.name} is not a supported text file (.csv, .tsv, .txt)`,
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(`${file.name} is larger than ${formatBytes(MAX_BYTES)}`);
      return;
    }
    onFile(file);
  };

  return (
    <Card
      as="section"
      title="Data"
      headingLevel={2}
      padding="sm"
      actions={
        <Menu
          label="Load a sample"
          items={SAMPLES.map((s) => ({ value: s.label, label: s.label }))}
          onSelect={(label) => {
            const s = SAMPLES.find((x) => x.label === label);
            if (s) onPasteChange(s.value);
          }}
          trigger={(props) => (
            <Button {...props} size="sm" variant="ghost" icon={sparkles}>
              Load a sample
            </Button>
          )}
        />
      }
    >
      <Stack gap="3">
        <CodeEditor
          aria-label="CSV or TSV data"
          language="csv"
          value={paste}
          onChange={onPasteChange}
          placeholder="Paste rows copied from a spreadsheet, or open or drop a CSV or TSV file"
          minHeight={200}
          maxHeight={360}
        />
        {paste === '' ? (
          <FileDrop
            size="sm"
            labels={{
              prompt: 'Drop a CSV, TSV or text file here, or',
              chooseOne: 'Open a file',
            }}
            onFiles={(files) => files[0] && open(files[0])}
          />
        ) : null}
        {fileError ? (
          <Notice
            tone="danger"
            dismissible
            onDismiss={() => setFileError(null)}
          >
            {fileError}
          </Notice>
        ) : null}
        <Inline gap="3" align="center" wrap>
          <Button
            variant="solid"
            icon={tableIcon}
            onClick={onOpenText}
            disabled={!paste.trim() || running}
          >
            Open as table
          </Button>
          {running && (
            <>
              <Text size="sm" tone="muted">
                {progress?.label ?? 'Reading'}
              </Text>
              {progress && (
                <ProgressBar
                  label="Loading progress"
                  labelHidden
                  value={progress.done}
                  max={progress.total}
                />
              )}
              <Button size="sm" variant="ghost" onClick={job.cancel}>
                Cancel
              </Button>
            </>
          )}
        </Inline>
        {job.error && (
          <Notice tone="danger" title="Could not read the data">
            {job.error.message}
          </Notice>
        )}
      </Stack>
    </Card>
  );
}
