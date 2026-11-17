import { Button, Inline } from '@arshad-shah/cynosure';
import { pause, play, rotateCcw } from '@arshad-shah/cynosure/icons';
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
  if (!filename) return null;
  return (
    <Inline gap="2">
      <Button
        variant="solid"
        size="sm"
        icon={isPlaying ? pause : play}
        disabled={status.current !== PlayerState.Active}
        onClick={togglePlayback}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      <Button variant="soft" size="sm" icon={rotateCcw} onClick={reset}>
        Reset
      </Button>
    </Inline>
  );
}
