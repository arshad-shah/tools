import {
  Button,
  IconButton,
  Inline,
  Kbd,
  Popover,
  SegmentedControl,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { pause, play, rotateCcw, sliders } from '@arshad-shah/cynosure/icons';
import type { TimelineState } from '../hooks/useTimeline';
import { SPEEDS, type LoopMode } from '../lib/timeline';
import { PlayerState, type Status } from '../types';

const SPEED_OPTIONS = SPEEDS.map((s) => ({ value: String(s), label: `${s}x` }));
const MODE_OPTIONS: { value: LoopMode; label: string }[] = [
  { value: 'loop', label: 'Loop' },
  { value: 'pingpong', label: 'Ping-pong' },
  { value: 'once', label: 'Once' },
];

/** Speed and loop mode: set once, so they sit behind one button. */
function PlaybackOptions({
  timeline,
  speed,
  onSpeedChange,
  speedSupported,
}: {
  timeline: TimelineState;
  speed: number;
  onSpeedChange: (speed: number) => void;
  speedSupported: boolean;
}) {
  const linear = timeline.duration !== null;
  return (
    <Popover
      label="Playback options"
      placement="bottom"
      align="end"
      trigger={(props) => (
        <IconButton
          {...props}
          size="sm"
          variant="soft"
          tone="neutral"
          icon={sliders}
          label="Playback options"
        />
      )}
    >
      <Stack gap="4">
        <Stack gap="2">
          <Text size="sm" weight="medium">
            Speed
          </Text>
          <SegmentedControl
            label="Playback speed"
            size="sm"
            fullWidth
            value={String(speed)}
            onChange={(v) => onSpeedChange(Number(v))}
            options={SPEED_OPTIONS.map((o) => ({
              ...o,
              disabled: !speedSupported,
            }))}
          />
          {!speedSupported ? (
            <Text size="sm" tone="muted">
              This version of the Rive runtime does not allow changing the
              speed.
            </Text>
          ) : null}
        </Stack>
        {linear ? (
          <Stack gap="2">
            <Text size="sm" weight="medium">
              Loop mode
            </Text>
            <SegmentedControl
              label="Loop mode"
              size="sm"
              fullWidth
              value={timeline.mode}
              onChange={(v) => timeline.setMode(v as LoopMode)}
              options={MODE_OPTIONS.map((o) => ({
                ...o,
                label:
                  o.value === timeline.fileMode ? `${o.label} (file)` : o.label,
              }))}
            />
            <Inline gap="2" align="center" wrap>
              <Text size="sm" tone="muted">
                Step a frame with
              </Text>
              <Kbd keys="," size="sm" />
              <Text size="sm" tone="muted">
                and
              </Text>
              <Kbd keys="." size="sm" />
              {timeline.fps ? (
                <Text size="sm" tone="muted">
                  {`(${timeline.fps} fps)`}
                </Text>
              ) : null}
            </Inline>
          </Stack>
        ) : null}
      </Stack>
    </Popover>
  );
}

/** Play / pause, reset and the playback options, shown once a file is loaded. */
export function PlaybackControls({
  filename,
  isPlaying,
  status,
  togglePlayback,
  reset,
  timeline,
  speed,
  onSpeedChange,
  speedSupported,
}: {
  filename: string | null;
  isPlaying: boolean;
  status: Status;
  togglePlayback: () => void;
  reset: () => void;
  timeline: TimelineState;
  speed: number;
  onSpeedChange: (speed: number) => void;
  speedSupported: boolean;
}) {
  if (!filename) return null;
  const active = status.current === PlayerState.Active;
  return (
    <Inline gap="2" wrap={false}>
      <Button
        variant="soft"
        size="sm"
        icon={isPlaying ? pause : play}
        disabled={!active}
        onClick={togglePlayback}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      <Button
        variant="soft"
        tone="neutral"
        size="sm"
        icon={rotateCcw}
        onClick={reset}
      >
        Reset
      </Button>
      {active ? (
        <PlaybackOptions
          timeline={timeline}
          speed={speed}
          onSpeedChange={onSpeedChange}
          speedSupported={speedSupported}
        />
      ) : null}
    </Inline>
  );
}
