import { Button, Inline, ProgressBar, Stack } from '@arshad-shah/cynosure';
import type { IconData } from '@arshad-shah/cynosure/icons';
import React from 'react';
import type { JobState } from '@/shared/state/useJob';

/** The primary action, then progress and Cancel while it runs. */
export const JobButton: React.FC<{
  label: string;
  icon: IconData;
  disabled: boolean;
  job: Pick<JobState<unknown>, 'status' | 'progress'> & { cancel(): void };
  onRun(): void;
}> = ({ label, icon, disabled, job, onRun }) => {
  const running = job.status === 'running';
  const p = job.progress;
  return (
    <Stack gap="3">
      <Inline gap="2" align="center" wrap>
        <Button
          variant="solid"
          tone="accent"
          icon={icon}
          disabled={disabled || running}
          loading={running}
          onClick={onRun}
        >
          {label}
        </Button>
        {running ? (
          <Button variant="ghost" onClick={job.cancel}>
            Cancel
          </Button>
        ) : null}
      </Inline>
      {running ? (
        <ProgressBar
          label={p?.label ?? 'Working'}
          size="sm"
          indeterminate={!p || !p.total}
          value={p?.done}
          max={p?.total || 1}
        />
      ) : null}
    </Stack>
  );
};
