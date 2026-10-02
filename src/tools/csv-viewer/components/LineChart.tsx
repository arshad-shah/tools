import React from 'react';
import type { ChartPoint } from '../types';
import { formatNumber } from '../lib/stats';

/**
 * Lightweight SVG line chart (kit has no chart primitive). Dark-only, uses
 * theme tokens via currentColor. Renders a single series of {index, value}.
 */
export const LineChart: React.FC<{
  data: ChartPoint[];
  height?: number;
}> = ({ data, height = 360 }) => {
  const points = data.filter((d) => Number.isFinite(d.value));

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-fg-subtle"
        // data-driven: chart height prop
        style={{ height }}
      >
        No numeric data to plot
      </div>
    );
  }

  const width = 800;
  const padding = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const n = points.length;

  const px = (i: number) =>
    padding.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const py = (v: number) =>
    padding.top + innerH - ((v - minV) / range) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(p.value)}`)
    .join(' ');

  const ticks = 4;
  const gridLines = Array.from({ length: ticks + 1 }, (_v, i) => {
    const value = minV + (range * i) / ticks;
    const y = padding.top + innerH - (innerH * i) / ticks;
    return { value, y };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Line chart"
    >
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={g.y}
            y2={g.y}
            stroke="currentColor"
            className="text-line"
            strokeWidth={1}
          />
          <text
            x={padding.left - 8}
            y={g.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-current text-[10px] text-fg-subtle"
          >
            {formatNumber(g.value)}
          </text>
        </g>
      ))}
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        className="text-accent"
        strokeWidth={2}
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={px(i)}
          cy={py(p.value)}
          r={2.5}
          className="fill-current text-accent"
        />
      ))}
    </svg>
  );
};
