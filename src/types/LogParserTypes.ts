// Types for logs and filtering
interface LogEntry {
  id: number;
  timestamp?: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'success';
  component?: string;
  message: string;
  details?: string;
  executionTime?: string;
  buildTime?: string;
  raw: string;
}

interface FilterCriteria {
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

interface LogCounts {
  error: number;
  warn: number;
  info: number;
  debug: number;
  success: number;
}

type LogType = 'spring' | 'django' | 'node' | 'log4j' | 'sql' | 'webpack' | 'generic' | 'auto';


export type { LogEntry, FilterCriteria, LogCounts, LogType };