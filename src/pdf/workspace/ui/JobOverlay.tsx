import { ProgressOverlay } from '@arshad-shah/cynosure';
import type { JobProgress } from '@/shared/state/useJob';

/**
 * A long job over the workspace (Cynosure ProgressOverlay): its title, a
 * bar when the steps are known, what it is doing now, and Cancel.
 */
export function JobOverlay({
  open,
  title,
  progress,
  onCancel,
}: {
  open: boolean;
  title: string;
  progress: JobProgress | null;
  onCancel(): void;
}) {
  return (
    <ProgressOverlay
      open={open}
      title={title}
      value={progress?.total ? progress.done : undefined}
      max={progress?.total || undefined}
      status={progress?.label}
      onCancel={onCancel}
    />
  );
}
