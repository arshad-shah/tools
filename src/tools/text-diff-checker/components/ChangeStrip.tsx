import { AspectRatio } from '@arshad-shah/cynosure';
import { BarChart } from '@arshad-shah/swift-chart';
import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
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
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<BarChart | null>(null);
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

  const jump = useEffectEvent((bucket: number) => {
    const line = bucket * size + 1;
    onJump(anchors.find((a) => a >= line) ?? anchors[anchors.length - 1]);
  });
  const description = `${anchors.length} changes across ${rows} lines`;

  useEffect(() => {
    const c = new BarChart(host.current!, {
      theme: theme.name,
      showLegend: false,
      showGrid: false,
      animate: false,
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
      ariaLabel: 'Change positions',
      formatValue: (v) => `${v} ${v === 1 ? 'change' : 'changes'}`,
      onClick: (i) => jump(i),
    });
    chart.current = c;
    return () => {
      c.destroy();
      chart.current = null;
    };
    // Created once; theme, data and the description follow below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => chart.current?.setTheme(theme.name), [theme.name]);
  useEffect(() => {
    chart.current?.update({ ariaDescription: description });
  }, [description]);
  useEffect(() => {
    chart.current?.setData([], {
      labels,
      datasets: [{ label: 'Changes', data: counts }],
    });
  }, [labels, counts]);

  return (
    <AspectRatio ratio={14}>
      <div ref={host} />
    </AspectRatio>
  );
}
