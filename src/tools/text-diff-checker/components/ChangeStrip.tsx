import { useMemo } from 'react';
import { Chart } from '@/shared/ui';

const BUCKETS = 60;

interface ChangeStripProps {
  /** First row of each change. */
  anchors: number[];
  rows: number;
  /** Jumps to the first change at or after this row. */
  onJump(row: number): void;
}

/**
 * Where the changes are (spec §8.1): a kit Chart heat strip of change
 * counts along the document; brushing a stretch jumps to its first change.
 */
export function ChangeStrip({ anchors, rows, onJump }: ChangeStripProps) {
  const series = useMemo(() => {
    const size = Math.max(1, Math.ceil(rows / BUCKETS));
    const counts = new Array<number>(Math.ceil(rows / size)).fill(0);
    for (const a of anchors)
      counts[Math.min(counts.length - 1, Math.floor((a - 1) / size))]++;
    return [
      {
        id: 'changes',
        label: 'Changes',
        points: counts.map((y, i) => ({ x: i * size + 1, y })),
      },
    ];
  }, [anchors, rows]);
  if (anchors.length === 0) return null;
  return (
    <Chart
      kind="bar"
      series={series}
      height={64}
      legend={false}
      ariaLabel="Change positions"
      ariaSummary={`${anchors.length} changes across ${rows} lines`}
      xLabel="Line"
      formatX={(x) => `line ${String(x)}`}
      brush={(range) => {
        if (!range) return;
        const target =
          anchors.find((a) => a >= range[0]) ?? anchors[anchors.length - 1];
        onJump(target);
      }}
    />
  );
}
