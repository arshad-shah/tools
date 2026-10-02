import { useMemo, useState } from 'react';
import { Button, Input, Label, Stack, Text } from '@/shared/ui';
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
      <Text size="sm" tone="subtle">
        Load a Rive file to edit its text.
      </Text>
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
          <Stack gap="1" key={run.name}>
            <Label htmlFor={`text-run-${run.name}`}>{run.name}</Label>
            <Input
              id={`text-run-${run.name}`}
              value={values[run.name] ?? run.text}
              onChange={(v) => apply(run.name, v)}
            />
          </Stack>
        ))
      ) : (
        <Text size="sm" tone="subtle">
          {runs
            ? 'This artboard has no text runs.'
            : 'Text runs cannot be listed with this runtime. Enter a run name to edit it.'}
        </Text>
      )}
      {!runs && (
        <Stack gap="2">
          <Label htmlFor="text-run-name">Text run name</Label>
          <Input id="text-run-name" value={runName} onChange={setRunName} />
          <Label htmlFor="text-run-text">Text</Label>
          <Input id="text-run-text" value={runText} onChange={setRunText} />
          <Button
            variant="secondary"
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
