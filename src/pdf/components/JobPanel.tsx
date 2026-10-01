import React from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Progress,
  Spinner,
  Text,
} from '@/shared/ui';
import type { JobState } from '@/shared/state/useJob';

interface JobPanelProps {
  job: JobState<unknown>;
  onCancel: () => void;
  runningLabel?: string;
  children?: React.ReactNode;
}

export const JobPanel: React.FC<JobPanelProps> = ({
  job,
  onCancel,
  runningLabel = 'Working',
  children,
}) => {
  if (job.status === 'idle') return null;

  if (job.status === 'running') {
    const p = job.progress;
    return (
      <div className="flex flex-col gap-3 rounded-md border border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <Text size="sm">
              {p
                ? `${p.label ?? runningLabel} · ${p.done} / ${p.total}`
                : `${runningLabel}…`}
            </Text>
          </div>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {p && <Progress value={p.done} max={p.total} />}
      </div>
    );
  }

  if (job.status === 'error' && job.error) {
    return (
      <Alert status="danger">
        <AlertTitle>That didn't work</AlertTitle>
        <AlertDescription>{job.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (job.status === 'cancelled') {
    return (
      <Alert status="info">
        <AlertDescription>Cancelled.</AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};
