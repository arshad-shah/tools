import { Button, Progress, Spinner } from '@/shared/ui';
import type { LogSource } from '../hooks/useLogSource';
import { progressText } from '../lib/progress';

/** Parsing progress ("Parsing 340.0 MB of 1.2 GB") with Cancel. */
export function OpenStatus({ source }: { source: LogSource }) {
  if (source.status !== 'opening') return null;
  const text = progressText(source.progress, source.fromFile);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span role="status" className="flex items-center gap-2 text-sm text-fg">
          <Spinner size="sm" decorative />
          {text}
        </span>
        <Button size="sm" variant="ghost" onClick={source.cancel}>
          Cancel
        </Button>
      </div>
      {source.fromFile && source.progress ? (
        <Progress
          label="Parsing progress"
          value={source.progress.done}
          max={source.progress.total || 1}
        />
      ) : null}
    </div>
  );
}
