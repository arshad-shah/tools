import { useMemo, useState } from 'react';
import {
  Button,
  EmptyState,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { notify } from '@/shared/lib/notify';
import { textRuns } from '../lib/animator';
import type { LoadedRive } from '../types';

/** Lists the active artboard's text runs; edits apply live. */
export function TextRunsPanel({ loaded }: { loaded: LoadedRive | null }) {
  const runs = useMemo(() => (loaded ? textRuns(loaded.rive) : null), [loaded]);
  // Edited values, per load (a new artboard starts from the file's text).
  const [edits, setEdits] = useState<{
    loaded: LoadedRive | null;
    values: Record<string, string>;
  }>({ loaded, values: {} });
  const values = edits.loaded === loaded ? edits.values : {};
  const [runName, setRunName] = useState('');
  const [runText, setRunText] = useState('');

  if (!loaded)
    return (
      <EmptyState
        size="sm"
        title="No file loaded"
        description="Load a Rive file to edit its text."
      />
    );
  const { rive } = loaded;

  const apply = (name: string, text: string) => {
    rive.setTextRunValue(name, text);
    setEdits({ loaded, values: { ...values, [name]: text } });
  };

  const applyNamed = () => {
    const name = runName.trim();
    if (!name) return;
    if (rive.getTextRunValue(name) === undefined) {
      notify.error(`No text run named "${name}" on this artboard`);
      return;
    }
    apply(name, runText);
  };

  return (
    <Stack gap="4">
      {runs && runs.length > 0 ? (
        runs.map((run) => (
          <TextField
            key={run.name}
            label={run.name}
            value={values[run.name] ?? run.text}
            onChange={(v) => apply(run.name, v)}
          />
        ))
      ) : (
        <Text size="sm" tone="muted">
          {runs
            ? 'This artboard has no text runs.'
            : 'Text runs cannot be listed with this runtime. Enter a run name to edit it.'}
        </Text>
      )}
      {!runs && (
        <Stack gap="3">
          <TextField
            label="Text run name"
            value={runName}
            onChange={setRunName}
          />
          <TextField label="Text" value={runText} onChange={setRunText} />
          <Button
            variant="soft"
            disabled={!runName.trim()}
            onClick={applyNamed}
          >
            Apply
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
