import {
  Grid,
  IconButton,
  Inline,
  Kbd,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { chevronLeft, chevronRight } from '@arshad-shah/cynosure/icons';
import type { TimelineState } from '../hooks/useTimeline';
import { FRAME, formatTime, SPEEDS, type LoopMode } from '../lib/timeline';

const SPEED_OPTIONS = SPEEDS.map((s) => ({ value: String(s), label: `${s}x` }));
const MODE_OPTIONS: { value: LoopMode; label: string }[] = [
  { value: 'loop', label: 'Loop' },
  { value: 'pingpong', label: 'Ping-pong' },
  { value: 'once', label: 'Once' },
];

/** Speed, scrubbing, loop mode, frame stepping and the time read-out. */
export function Timeline({
  timeline,
  speed,
  onSpeedChange,
  speedSupported,
  disabled,
}: {
  timeline: TimelineState;
  speed: number;
  onSpeedChange: (speed: number) => void;
  speedSupported: boolean;
  disabled: boolean;
}) {
  const { duration, time } = timeline;
  return (
    <Stack gap="4">
      <Inline gap="3" wrap align="center" justify="between">
        <SegmentedControl
          label="Playback speed"
          size="sm"
          value={String(speed)}
          onChange={(v) => onSpeedChange(Number(v))}
          options={SPEED_OPTIONS.map((o) => ({
            ...o,
            disabled: disabled || !speedSupported,
          }))}
        />
        {duration !== null ? (
          <SegmentedControl
            label="Loop mode"
            size="sm"
            value={timeline.mode}
            onChange={(v) => timeline.setMode(v as LoopMode)}
            options={MODE_OPTIONS.map((o) => ({
              ...o,
              label:
                o.value === timeline.fileMode ? `${o.label} (file)` : o.label,
            }))}
          />
        ) : null}
      </Inline>
      {!speedSupported ? (
        <Text size="sm" tone="muted">
          This version of the Rive runtime does not allow changing the speed.
        </Text>
      ) : null}
      {duration !== null ? (
        <Grid columns="auto minmax(0, 1fr) auto auto" gap="2" align="center">
          <IconButton
            variant="soft"
            tone="neutral"
            size="sm"
            label="Previous frame"
            icon={chevronLeft}
            aria-keyshortcuts=","
            onClick={() => timeline.step(-1)}
          />
          <Slider
            label="Scrub"
            labelHidden
            min={0}
            max={duration}
            step={FRAME}
            value={Math.min(time, duration)}
            onChange={(v) => timeline.scrub(v as number)}
          />
          <IconButton
            variant="soft"
            tone="neutral"
            size="sm"
            label="Next frame"
            icon={chevronRight}
            aria-keyshortcuts="."
            onClick={() => timeline.step(1)}
          />
          <Text size="sm" numeric>
            {`${formatTime(time)} of ${formatTime(duration)}`}
          </Text>
        </Grid>
      ) : (
        <Text size="sm" tone="muted">
          Scrubbing and frame stepping work on linear animations. Pick one under
          Animations.
        </Text>
      )}
      {duration !== null ? (
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
              {`(the animation runs at ${timeline.fps} fps)`}
            </Text>
          ) : null}
        </Inline>
      ) : null}
    </Stack>
  );
}
