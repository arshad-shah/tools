// Basic parsed data structure
export interface ParsedData {
  [key: string]: unknown;
}

// Column statistics type
export interface ColumnStatistics {
  min: number;
  max: number;
  avg: number;
  count: number;
  sum: number;
}

// Data statistics record type
export interface Statistics {
  [column: string]: ColumnStatistics;
}

// Sort direction
export type SortDirection = 'asc' | 'desc';

// One plotted point of the line chart
export interface ChartPoint {
  index: number;
  value: number;
}
