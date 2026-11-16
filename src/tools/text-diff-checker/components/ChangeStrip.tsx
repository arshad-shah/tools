import { Bar } from '@arshad-shah/swift-chart/react';
import { useMemo } from 'react';
// swift-chart draws the strip (a canvas); everything around it is Cynosure.
import { useChartTheme } from '@/shared/charts';

const BUCKETS = 60;

interface ChangeStripProps {
  /** First row of each change. */
  anchors: number[];
  rows: number;
  /** Jumps to the first change at or after this row. */
  onJump(row: number): void;
}

/**
 * Where the changes are (spec §8.1): a swift-chart bar strip of change
 * counts along the document; clicking a bar (or Enter on a bar chosen with
 * the arrow keys) jumps to the first change in its stretch.
 */
export function ChangeStrip(props: ChangeStripProps) {
  return props.anchors.length === 0 ? null : <Strip {...props} />;
}

function Strip({ anchors, rows, onJump }: ChangeStripProps) {
  const theme = useChartTheme();
  const { size, labels, counts } = useMemo(() => {
    const size = Math.max(1, Math.ceil(rows / BUCKETS));
    const counts = new Array<number>(Math.ceil(rows / size)).fill(0);
    for (const a of anchors)
      counts[Math.min(counts.length - 1, Math.floor((a - 1) / size))]++;
    const labels = counts.map((_, i) =>
      size === 1
        ? `Line ${i + 1}`
        : `Lines ${i * size + 1} to ${Math.min(rows, (i + 1) * size)}`,
    );
    return { size, labels, counts };
  }, [anchors, rows]);

  const jump = (bucket: number) => {
    const line = bucket * size + 1;
    onJump(anchors.find((a) => a >= line) ?? anchors[anchors.length - 1]);
  };
  const description = `${anchors.length} changes across ${rows} lines`;

  return (
    <Bar
      data={[]}
      mapping={{ labels, datasets: [{ label: 'Changes', data: counts }] }}
      theme={theme.name}
      height={64}
      showLegend={false}
      showGrid={false}
      animate={false}
      padding={{ top: 4, right: 4, bottom: 4, left: 4 }}
      ariaLabel="Change positions"
      ariaDescription={description}
      formatValue={(v) => `${v} ${v === 1 ? 'change' : 'changes'}`}
      onPointClick={(i) => jump(i)}
    />
  );
}
