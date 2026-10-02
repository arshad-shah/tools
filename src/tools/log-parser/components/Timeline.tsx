import { useMemo } from 'react';
import { Button, Chart, type ChartSeries } from '@/shared/ui';
import { IconX } from '@/shared/ui/icons';
import type { Histogram } from '../hooks/useLogSource';
import { levelLabel, orderLevels } from '../lib/level-style';
import { rowTime } from '../lib/progress';

export interface TimelineProps {
  histogram: Histogram;
  range: [number, number] | undefined;
  onRange(range: [number, number] | undefined): void;
}

/** Stacked bars of entries per level over time; drag to filter a range. */
export function Timeline({ histogram, range, onRange }: TimelineProps) {
  const series = useMemo<ChartSeries[]>(() => {
    const { t0, t1, counts } = histogram;
    const buckets = Object.values(counts)[0]?.length ?? 0;
    const width = (t1 - t0) / Math.max(1, buckets) || 1;
    const totals = Object.fromEntries(
      Object.entries(counts).map(([l, c]) => [l, c.reduce((a, b) => a + b, 0)]),
    );
    return orderLevels(totals).map((level) => ({
      id: level,
      label: levelLabel(level),
      points: counts[level].map((y, b) => ({
        x: new Date(t0 + b * width),
        y,
      })),
    }));
  }, [histogram]);

  if (series.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-fg-muted">
          {range
            ? `Showing ${rowTime(range[0])} to ${rowTime(range[1])}`
            : 'Drag across the timeline to filter a time range'}
        </span>
        {range ? (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<IconX size="sm" />}
            onClick={() => onRange(undefined)}
          >
            Clear time range
          </Button>
        ) : null}
      </div>
      <Chart
        kind="bar"
        stacked
        xType="time"
        height={140}
        series={series}
        ariaLabel="Entries over time by level"
        ariaSummary={`From ${rowTime(histogram.t0)} to ${rowTime(histogram.t1)}`}
        brush={(r) =>
          onRange(r ? [Math.floor(r[0]), Math.ceil(r[1])] : undefined)
        }
      />
    </div>
  );
}
