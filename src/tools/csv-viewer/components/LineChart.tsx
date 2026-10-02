import React from 'react';
import { LineChart as KitLineChart } from '@/shared/ui';
import type { ChartPoint } from '../types';
import { formatNumber } from '../lib/stats';

/** Single series of {index, value} on the kit line chart. */
export const LineChart: React.FC<{
  data: ChartPoint[];
  height?: number;
}> = ({ data, height = 360 }) => (
  <KitLineChart
    label="Line chart"
    values={data.map((d) => d.value)}
    height={height}
    formatTick={formatNumber}
  />
);
