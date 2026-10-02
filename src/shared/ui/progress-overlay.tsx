import { cn } from '@/shared/lib/cn';
import type { JobProgress } from '@/shared/state/useJob';
import { Button } from './button';
import { Dialog, DialogBody, DialogFooter, DialogTitle } from './dialog';

export interface ProgressOverlayProps {
  open: boolean;
  title: string;
  /** null: indeterminate. */
  progress: JobProgress | null;
  onCancel?(): void;
  cancelLabel?: string;
}

/**
 * Modal progress for long document work (spec §4.6). Esc and the Cancel
 * button both call onCancel; without onCancel the overlay cannot be closed.
 */
export function ProgressOverlay({
  open,
  title,
  progress,
  onCancel,
  cancelLabel = 'Cancel',
}: ProgressOverlayProps) {
  const total = progress ? Math.max(1, progress.total) : 0;
  const pct = progress ? Math.min(100, (progress.done / total) * 100) : 0;
  const text = progress
    ? (progress.label ?? `${progress.done} of ${progress.total}`)
    : 'Working';
  return (
    <Dialog
      open={open}
      label={title}
      onOpenChange={(o) => {
        if (!o) onCancel?.();
      }}
    >
      <DialogBody className="flex flex-col gap-3">
        <DialogTitle className="text-md">{title}</DialogTitle>
        <div
          role="progressbar"
          aria-label={title}
          aria-valuemin={progress ? 0 : undefined}
          aria-valuenow={progress ? progress.done : undefined}
          aria-valuemax={progress ? progress.total : undefined}
          aria-valuetext={text}
          className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3"
        >
          <div
            className={cn(
              'h-full rounded-full bg-accent-indicator',
              progress
                ? 'transition-[width] duration-base'
                : 'w-1/3 motion-safe:animate-pulse',
            )}
            style={progress ? { width: `${pct}%` } : undefined}
          />
        </div>
        <p aria-live="polite" className="text-sm text-fg-muted">
          {text}
        </p>
      </DialogBody>
      {onCancel ? (
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </DialogFooter>
      ) : null}
    </Dialog>
  );
}
ProgressOverlay.displayName = 'ProgressOverlay';
