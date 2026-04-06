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

// Chart data point
export interface ChartDataPoint {
  index: number;
  value: number;
}

// File parser props
export interface FileParserProps {
  onDataParsed: (data: ParsedData[], columns: string[], fileName: string) => void;
}

// Data viewer props
export interface DataViewerProps {
  data: ParsedData[];
  columns: string[];
  fileName: string;
  onReset: () => void;
}

// Tab options
export type TabOption = 'data' | 'stats' | 'chart';

// Sort direction
export type SortDirection = 'asc' | 'desc';

// Data table props
export interface DataTableProps {
  data: ParsedData[];
  columns: string[];
  selectedColumns: string[];
  onToggleColumn: (column: string) => void;
  sortColumn: string;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  filterColumn: string;
  filterValue: string;
  onFilterChange: (column: string, value: string) => void;
}

// Statistics panel props
export interface StatisticsPanelProps {
  statistics: Statistics;
}

// Chart panel props
export interface ChartPanelProps {
  data: ParsedData[];
  numericColumns: string[];
  chartColumn: string;
  onChartColumnChange: (column: string) => void;
}

// Control panel props
export interface ControlPanelProps {
  columns: string[];
  selectedColumns: string[];
  onToggleAllColumns: () => void;
  filterColumn: string;
  filterValue: string;
  onFilterChange: (column: string, value: string) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  filteredCount: number;
  totalCount: number;
  onExport: () => void;
}