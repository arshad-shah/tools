import { IconChevronLeft, IconChevronRight } from '@/shared/ui/icons';
import {
  IconButton,
  Inline,
  Kbd,
  SegmentedControl,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';
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
    <Stack gap="3">
      <Inline gap="3" wrap align="center" justify="between">
        <Inline gap="2" align="center">
          <Text size="sm" tone="subtle">
            Speed
          </Text>
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
        </Inline>
        {duration !== null && (
          <SegmentedControl
            label="Loop mode"
            size="sm"
            value={timeline.mode}
            onChange={timeline.setMode}
            options={MODE_OPTIONS.map((o) => ({
              ...o,
              label:
                o.value === timeline.fileMode ? `${o.label} (file)` : o.label,
            }))}
          />
        )}
      </Inline>
      {!speedSupported && (
        <Text size="xs" tone="subtle">
          This version of the Rive runtime does not allow changing the speed.
        </Text>
      )}
      {duration !== null ? (
        <Inline gap="2" align="center">
          <IconButton
            variant="secondary"
            size="sm"
            label="Previous frame"
            icon={<IconChevronLeft size="sm" />}
            onClick={() => timeline.step(-1)}
          />
          <Slider
            aria-label="Scrub"
            min={0}
            max={duration}
            step={FRAME}
            value={Math.min(time, duration)}
            onValueChange={timeline.scrub}
            className="flex-1"
          />
          <IconButton
            variant="secondary"
            size="sm"
            label="Next frame"
            icon={<IconChevronRight size="sm" />}
            onClick={() => timeline.step(1)}
          />
          <Text size="sm" mono className="shrink-0 tabular-nums">
            {formatTime(time)} of {formatTime(duration)}
          </Text>
        </Inline>
      ) : (
        <Text size="sm" tone="subtle">
          Scrubbing and frame stepping work on linear animations. Pick one on
          the Animations tab.
        </Text>
      )}
      {duration !== null && (
        <Text size="xs" tone="subtle">
          Step a frame with <Kbd keys="," /> and <Kbd keys="." />
          {timeline.fps ? ` (the animation runs at ${timeline.fps} fps)` : ''}
        </Text>
      )}
    </Stack>
  );
}
