import type { FilterCriteria, LogCounts, LogEntry } from '../types';

// Filter logs based on criteria
export const filterLogs = (
  logs: LogEntry[],
  criteria: FilterCriteria,
): LogEntry[] => {
  return logs.filter((log) => {
    // Filter by log level
    if (!criteria.levelFilters[log.level]) {
      return false;
    }

    // Filter by text search
    if (
      criteria.textSearch &&
      !log.raw.toLowerCase().includes(criteria.textSearch.toLowerCase())
    ) {
      return false;
    }

    // Filter by component
    if (
      criteria.component &&
      log.component &&
      !log.component.toLowerCase().includes(criteria.component.toLowerCase())
    ) {
      return false;
    }

    // Filter by time range
    if (criteria.timeRange.start && log.timestamp) {
      try {
        const logTime = new Date(log.timestamp.replace(',', '.'));
        const startTime = new Date(criteria.timeRange.start);
        if (logTime < startTime) {
          return false;
        }
      } catch {
        // Ignore date parsing errors
      }
    }

    if (criteria.timeRange.end && log.timestamp) {
      try {
        const logTime = new Date(log.timestamp.replace(',', '.'));
        const endTime = new Date(criteria.timeRange.end);
        if (logTime > endTime) {
          return false;
        }
      } catch {
        // Ignore date parsing errors
      }
    }

    return true;
  });
};

// Count logs by level
export const countLogsByLevel = (logs: LogEntry[]): LogCounts => {
  return {
    error: logs.filter((log) => log.level === 'error').length,
    warn: logs.filter((log) => log.level === 'warn').length,
    info: logs.filter((log) => log.level === 'info').length,
    debug: logs.filter((log) => log.level === 'debug').length,
    success: logs.filter((log) => log.level === 'success').length,
  };
};
