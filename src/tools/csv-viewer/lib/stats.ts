import _ from 'lodash';
import type { ParsedData, Statistics } from '../types';

export const formatNumber = (value: number, decimals = 2): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Min/max/avg/count/sum for every listed column that holds numbers. */
export function columnStatistics(
  data: ParsedData[],
  columns: string[],
): Statistics {
  const stats: Statistics = {};
  columns.forEach((col) => {
    const numericValues = data
      .map((row) => row[col])
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    if (numericValues.length > 0) {
      stats[col] = {
        min: _.min(numericValues) || 0,
        max: _.max(numericValues) || 0,
        avg: _.sum(numericValues) / numericValues.length,
        count: numericValues.length,
        sum: _.sum(numericValues),
      };
    }
  });
  return stats;
}
