import { Grid, IconButton, Slider, Text } from '@arshad-shah/cynosure';
import { chevronLeft, chevronRight } from '@arshad-shah/cynosure/icons';
import type { TimelineState } from '../hooks/useTimeline';
import { FRAME, formatTime } from '../lib/timeline';

/**
 * The transport under the stage: frame stepping, scrubbing and the time
 * read-out. Speed and loop mode live in the Playback options popover.
 */
export function Timeline({ timeline }: { timeline: TimelineState }) {
  const { duration, time } = timeline;
  if (duration === null)
    return (
      <Text size="sm" tone="muted">
        Scrubbing and frame stepping work on linear animations. Pick one under
        Animations.
      </Text>
    );
  return (
    <Grid columns="auto minmax(0, 1fr) auto auto" gap="2" align="center">
      <IconButton
        variant="soft"
        tone="neutral"
        size="sm"
        label="Previous frame"
        icon={chevronLeft}
        flipRtl
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
        flipRtl
        aria-keyshortcuts="."
        onClick={() => timeline.step(1)}
      />
      <Text size="sm" numeric>
        {`${formatTime(time)} of ${formatTime(duration)}`}
      </Text>
    </Grid>
  );
}
