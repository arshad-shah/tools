import { Button, Notice, ProgressBar, Stack } from '@arshad-shah/cynosure';
import type { LogSource } from '../hooks/useLogSource';
import { progressText } from '../lib/progress';

/** Parsing progress ("Parsing 340.0 MB of 1.2 GB") with Cancel. */
export function OpenStatus({ source }: { source: LogSource }) {
  if (source.status !== 'opening') return null;
  const text = progressText(source.progress, source.fromFile);
  return (
    <Notice
      tone="info"
      title={text}
      action={
        <Button size="sm" variant="ghost" onClick={source.cancel}>
          Cancel
        </Button>
      }
    >
      {source.fromFile && source.progress ? (
        <Stack paddingBlock="2">
          <ProgressBar
            label="Parsing progress"
            labelHidden
            value={source.progress.done}
            max={source.progress.total || 1}
          />
        </Stack>
      ) : null}
    </Notice>
  );
}
