import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Inline, Slider, Stack, Text } from '@arshad-shah/cynosure';
import { close } from '@arshad-shah/cynosure/icons';
import { StackedBar, type ChartRef } from '@arshad-shah/swift-chart/react';
// swift-chart draws the chart (a canvas); everything around it is Cynosure.
import { ChartFrame, useChartTheme } from '@/shared/charts';
import type { Histogram } from '../hooks/useLogSource';
import {
  levelColour,
  levelLabel,
  levelTone,
  orderLevels,
} from '../lib/level-style';
import { rowTime } from '../lib/progress';

export interface TimelineProps {
  histogram: Histogram;
  range: [number, number] | undefined;
  onRange(range: [number, number] | undefined): void;
}

/** A colour at a quarter strength, for bars outside the chosen range. */
const faded = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}40` : hex);

/**
 * Stacked bars of entries per level over time, coloured like the level
 * badges, with a readout of the bar under the pointer. A click on a bar, or the range slider under the chart, filters
 * to a stretch of time.
 */
export function Timeline({ histogram, range, onRange }: TimelineProps) {
  const chart = useChartTheme();
  // The slider's thumbs while dragging, before the range is applied.
  const [draft, setDraft] = useState<number[] | null>(null);
  // Hover readout: the bucket under the pointer, from swift-chart's hover.
  const [hover, setHover] = useState<number | null>(null);
  const plot = useRef<HTMLElement>(null);
  const bars = useRef<ChartRef>(null);
  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    const read = () => {
      const i = bars.current?.chart?.hoverIndex ?? -1;
      setHover(i >= 0 ? i : null);
    };
    const leave = () => setHover(null);
    el.addEventListener('mousemove', read);
    el.addEventListener('touchend', read);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mousemove', read);
      el.removeEventListener('touchend', read);
      el.removeEventListener('mouseleave', leave);
    };
  }, []);
  const { t0, t1, counts } = histogram;
  const buckets = Object.values(counts)[0]?.length ?? 0;
  const width = (t1 - t0) / Math.max(1, buckets) || 1;
  const startOf = (b: number) => t0 + b * width;
  const bucketOf = (t: number) =>
    Math.max(0, Math.min(buckets - 1, Math.floor((t - t0) / width)));

  const { levels, labels, rows } = useMemo(() => {
    const totals = Object.fromEntries(
      Object.entries(counts).map(([l, c]) => [l, c.reduce((a, b) => a + b, 0)]),
    );
    const levels = orderLevels(totals);
    // Times of day for a short log; the date too when it spans days.
    const from = t1 - t0 > 86_400_000 ? 5 : 11;
    const labels = Array.from({ length: buckets }, (_, b) =>
      rowTime(t0 + b * width).slice(from, 19),
    );
    const rows = labels.map((_, b) => ({
      id: String(b),
      at: rowTime(t0 + b * width),
      ...Object.fromEntries(levels.map((l) => [l, counts[l][b]])),
    }));
    return { levels, labels, rows };
  }, [counts, t0, t1, buckets, width]);

  if (levels.length === 0) return null;
  const shown: [number, number] = range
    ? [bucketOf(range[0]), bucketOf(range[1] - 1)]
    : [0, buckets - 1];
  const datasets = levels.map((level) => ({
    label: levelLabel(level),
    data: counts[level],
    color: levelColour(levelTone(level), chart.colors),
  }));
  const pick = (from: number, to: number) =>
    onRange(
      from === 0 && to === buckets - 1
        ? undefined
        : [Math.floor(startOf(from)), Math.ceil(startOf(to + 1))],
    );

  return (
    <Stack gap="2">
      <Inline gap="2" align="center" justify="between" wrap>
        <Text size="sm" tone="muted">
          {range
            ? `Showing ${rowTime(range[0])} to ${rowTime(range[1])}`
            : 'Click a bar, or move the range under the chart, to filter a time range'}
        </Text>
        {range ? (
          <Button
            size="sm"
            variant="ghost"
            icon={close}
            onClick={() => onRange(undefined)}
          >
            Clear time range
          </Button>
        ) : null}
      </Inline>
      <ChartFrame
        table={{
          caption: 'Entries over time by level',
          rows,
          getRowId: (r) => r.id,
          columns: [
            { key: 'at', header: 'From' },
            ...levels.map((l) => ({
              key: l,
              header: levelLabel(l),
              align: 'end' as const,
            })),
          ],
        }}
      >
        <Stack ref={plot}>
          <StackedBar
            ref={bars}
            data={[]}
            // No axis text: 60 thin buckets leave room for none, so the
            // readout below and the range slider name the times.
            mapping={{ labels: labels.map(() => ''), datasets }}
            theme={chart.name}
            height={200}
            animate={false}
            legendPosition="bottom"
            ariaLabel="Entries over time by level"
            ariaDescription={`From ${rowTime(t0)} to ${rowTime(t1)}`}
            colorFn={(_v, i, s) =>
              i < shown[0] || i > shown[1]
                ? faded(datasets[s].color)
                : undefined
            }
            onPointClick={(i) => pick(i, i)}
          />
        </Stack>
        <Inline aria-live="polite">
          <Text size="sm" tone="muted" numeric>
            {hover !== null && rows[hover]
              ? `${rows[hover].at}: ${levels
                  .map(
                    (l) => `${counts[l][hover]} ${levelLabel(l).toLowerCase()}`,
                  )
                  .join(', ')}`
              : `${rowTime(t0)} to ${rowTime(t1)}. Point at a bar for its counts.`}
          </Text>
        </Inline>
        {buckets > 1 ? (
          <Slider
            label="Time range"
            size="sm"
            min={0}
            max={buckets - 1}
            value={draft ?? shown}
            onChange={(v) => setDraft(v as number[])}
            onCommit={(v) => {
              const [a, b] = v as number[];
              setDraft(null);
              pick(a, b);
            }}
            labels={{
              minimum: 'from',
              maximum: 'to',
              value: (b) => labels[b] ?? '',
            }}
            showValue
          />
        ) : null}
      </ChartFrame>
    </Stack>
  );
}
