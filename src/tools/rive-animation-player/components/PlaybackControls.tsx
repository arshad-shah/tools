import { IconPause, IconPlay, IconRotateCcw } from '@/shared/ui/icons';

import { Button, Inline } from '@/shared/ui';
import { PlayerState, type Status } from '../types';

/** Play / pause and reset, shown once a file is loaded. */
export function PlaybackControls({
  filename,
  isPlaying,
  status,
  togglePlayback,
  reset,
}: {
  filename: string | null;
  isPlaying: boolean;
  status: Status;
  togglePlayback: () => void;
  reset: () => void;
}) {
  return (
    <>
      {filename && (
        <Inline gap="2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              isPlaying ? <IconPause size="sm" /> : <IconPlay size="sm" />
            }
            disabled={status.current !== PlayerState.Active}
            onClick={togglePlayback}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconRotateCcw size="sm" />}
            onClick={reset}
          >
            Reset
          </Button>
        </Inline>
      )}
    </>
  );
}
