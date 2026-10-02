import { Sized } from './positioned';

export interface LineChartProps {
  /** One series, plotted left to right; non-finite values are skipped. */
  values: number[];
  /** Accessible name of the chart. */
  label: string;
  /** CSS px. Default 360. */
  height?: number;
  /** Y-axis tick text. Default `String`. */
  formatTick?(value: number): string;
  /** Shown instead of the chart when nothing is plottable. */
  emptyText?: string;
}

const WIDTH = 800;
const PAD = { top: 16, right: 16, bottom: 32, left: 56 };
const TICKS = 4;

/** Lightweight single-series SVG line chart on theme tokens. */
export function LineChart({
  values: raw,
  label,
  height = 360,
  formatTick = String,
  emptyText = 'No numeric data to plot',
}: LineChartProps) {
  const values = raw.filter((v) => Number.isFinite(v));
  if (values.length === 0) {
    return (
      <Sized
        height={height}
        className="flex items-center justify-center text-sm text-fg-subtle"
      >
        {emptyText}
      </Sized>
    );
  }

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const n = values.length;
  const px = (i: number) =>
    PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const py = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH;
  const linePath = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(v)}`)
    .join(' ');
  const grid = Array.from({ length: TICKS + 1 }, (_v, i) => ({
    value: minV + (range * i) / TICKS,
    y: PAD.top + innerH - (innerH * i) / TICKS,
  }));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {grid.map((g, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={g.y}
            y2={g.y}
            stroke="currentColor"
            className="text-line"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={g.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-current text-[10px] text-fg-subtle"
          >
            {formatTick(g.value)}
          </text>
        </g>
      ))}
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        className="text-accent-fg"
        strokeWidth={2}
      />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={px(i)}
          cy={py(v)}
          r={2.5}
          className="fill-current text-accent-fg"
        />
      ))}
    </svg>
  );
}
LineChart.displayName = 'LineChart';
