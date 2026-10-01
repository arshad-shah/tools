// Core types for the log parser application

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'success';

export type LogType =
  | 'spring'
  | 'django'
  | 'node'
  | 'log4j'
  | 'sql'
  | 'webpack'
  | 'generic'
  | 'auto';

export interface LogEntry {
  id: number | string;
  timestamp?: string;
  level: LogLevel;
  component?: string;
  message: string;
  details?: string;
  executionTime?: string;
  buildTime?: string;
  raw: string;
}

export interface FilterCriteria {
  levelFilters: {
    error: boolean;
    warn: boolean;
    info: boolean;
    debug: boolean;
    success: boolean;
  };
  textSearch?: string;
  component?: string;
  timeRange: {
    start?: string;
    end?: string;
  };
}

export interface LogCounts {
  error: number;
  warn: number;
  info: number;
  debug: number;
  success: number;
}

export interface ViewMode {
  mode: 'split' | 'input' | 'output';
}
