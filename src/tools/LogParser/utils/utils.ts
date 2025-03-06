import { FilterCriteria, LogCounts, LogEntry } from "../../../types/LogParserTypes";


type LogType = 'spring' | 'django' | 'node' | 'log4j' | 'sql' | 'webpack' | 'generic' | 'auto';

// Detect log type based on content patterns
const detectLogType = (text: string): LogType => {
  if (text.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?\[(INFO|WARN|ERROR|DEBUG)\]/m)) {
    return 'spring';
  } else if (text.match(/^\[\d{4}-\d{2}-\d{2}.*?\] (INFO|WARNING|ERROR|DEBUG)/m)) {
    return 'django';
  } else if (text.match(/^.*?\d+:\d+:\d+ (info|warn|error|debug)/mi)) {
    return 'node';
  } else if (text.match(/(INFO|WARN|ERROR|DEBUG) -- /m)) {
    return 'log4j';
  } else if (text.includes('Executing SQL') || text.includes('SELECT') || text.includes('INSERT')) {
    return 'sql';
  } else if (text.includes('webpack') || text.includes('compiled') || text.includes('chunk')) {
    return 'webpack';
  } else {
    return 'generic';
  }
};

// Main parse function that delegates to specific parsers
const parseLogsByType = (text: string, type: LogType): LogEntry[] => {
  const actualType = type === 'auto' ? detectLogType(text) : type;
  const lines = text.split('\n').filter(line => line.trim());
  
  switch (actualType) {
    case 'spring':
      return parseSpringLogs(lines);
    case 'django':
      return parseDjangoLogs(lines);
    case 'node':
      return parseNodeLogs(lines);
    case 'log4j':
      return parseLog4jLogs(lines);
    case 'sql':
      return parseSqlLogs(lines);
    case 'webpack':
      return parseWebpackLogs(lines);
    default:
      return parseGenericLogs(lines);
  }
};

// Parser for Spring Boot logs
const parseSpringLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+).*?\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(\s+-\s+(.*))?$/);
    if (match) {
      const [, timestamp, level, component, message, , details] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase() as LogEntry['level'],
        component,
        message,
        details: details || '',
        raw: line
      };
    }
    return { id: index, level: 'info', message: line, raw: line };
  });
};

// Parser for Django logs
const parseDjangoLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(/^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\]\s+(INFO|WARNING|ERROR|DEBUG)\s+(.*?):\s+(.*)$/i);
    if (match) {
      const [, timestamp, level, component, message] = match;
      return {
        id: index,
        timestamp,
        level: (level.toLowerCase().replace('warning', 'warn')) as LogEntry['level'],
        component,
        message,
        raw: line
      };
    }
    return { id: index, level: 'info', message: line, raw: line };
  });
};

// Parser for Node.js logs
const parseNodeLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(/^(.*?\d{2}:\d{2}:\d{2})\s+(info|warn|error|debug):\s+(.*)$/i);
    if (match) {
      const [, timestamp, level, message] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase() as LogEntry['level'],
        message,
        raw: line
      };
    }
    return { id: index, level: 'info', message: line, raw: line };
  });
};

// Parser for Log4j logs
const parseLog4jLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+(INFO|WARN|ERROR|DEBUG)\s+\[(.*?)\]\s+(.*)$/i);
    if (match) {
      const [, timestamp, level, component, message] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase() as LogEntry['level'],
        component,
        message,
        raw: line
      };
    }
    return { id: index, level: 'info', message: line, raw: line };
  });
};

// Parser for SQL logs
const parseSqlLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    // Check for common SQL execution patterns
    const timeMatch = line.match(/Executed in (\d+) ms/);
    const executionTime = timeMatch ? timeMatch[1] + 'ms' : undefined;
    
    let level: LogEntry['level'] = 'info';
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')) {
      level = 'error';
    } else if (line.toLowerCase().includes('warn')) {
      level = 'warn';
    }
    
    return {
      id: index,
      level,
      message: line,
      executionTime,
      raw: line
    };
  });
};

// Parser for Webpack logs
const parseWebpackLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    let level: LogEntry['level'] = 'info';
    if (line.includes('ERROR')) {
      level = 'error';
    } else if (line.includes('WARNING')) {
      level = 'warn';
    } else if (line.includes('success')) {
      level = 'success';
    }
    
    const match = line.match(/in (\d+) ms/);
    const buildTime = match ? match[1] + 'ms' : undefined;
    
    return {
      id: index,
      level,
      message: line,
      buildTime,
      raw: line
    };
  });
};

// Parser for Generic logs with best-effort detection
const parseGenericLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    let level: LogEntry['level'] = 'info';
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('exception') || line.toLowerCase().includes('fail')) {
      level = 'error';
    } else if (line.toLowerCase().includes('warn')) {
      level = 'warn';
    } else if (line.toLowerCase().includes('debug')) {
      level = 'debug';
    } else if (line.toLowerCase().includes('success') || line.toLowerCase().includes('completed successfully')) {
      level = 'success';
    }
    
    // Try to extract timestamp with a generic approach
    const timestampMatch = line.match(/\d{4}[-/]\d{2}[-/]\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?/);
    const timestamp = timestampMatch ? timestampMatch[0] : undefined;
    
    return {
      id: index,
      timestamp,
      level,
      message: line,
      raw: line
    };
  });
};

// Filter logs based on criteria
const filterLogs = (logs: LogEntry[], criteria: FilterCriteria): LogEntry[] => {
  return logs.filter(log => {
    // Filter by log level
    if (!criteria.levelFilters[log.level]) {
      return false;
    }
    
    // Filter by text search
    if (criteria.textSearch && !log.raw.toLowerCase().includes(criteria.textSearch.toLowerCase())) {
      return false;
    }
    
    // Filter by component
    if (criteria.component && log.component && !log.component.toLowerCase().includes(criteria.component.toLowerCase())) {
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
      } catch{
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
const countLogsByLevel = (logs: LogEntry[]): LogCounts => {
  return {
    error: logs.filter(log => log.level === 'error').length,
    warn: logs.filter(log => log.level === 'warn').length,
    info: logs.filter(log => log.level === 'info').length,
    debug: logs.filter(log => log.level === 'debug').length,
    success: logs.filter(log => log.level === 'success').length
  };
};

// Export logs as JSON
const exportLogsAsJson = (logs: LogEntry[]): void => {
  const dataStr = JSON.stringify(logs, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = 'parsed_logs.json';
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Copy logs to clipboard
const copyLogsToClipboard = (logs: LogEntry[]): Promise<void> => {
  return navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
};

// Sample log creator for testing
const createSampleLogs = (): string => {
  return `2023-07-15T08:23:45.123 [INFO] [com.example.UserService] User authentication successful - userId=12345
2023-07-15T08:23:46.456 [WARN] [com.example.SecurityFilter] Suspicious login attempt detected from IP 192.168.1.10
2023-07-15T08:24:01.789 [ERROR] [com.example.DatabaseService] Failed to connect to database - java.sql.SQLException: Connection refused
2023-07-15T08:24:05.234 [DEBUG] [com.example.ConfigLoader] Loading application properties from /etc/app/config.properties
2023-07-15T08:24:10.567 [INFO] [com.example.StartupManager] Application started in 3.45 seconds`;
};

export {
  detectLogType,
  parseLogsByType,
  filterLogs,
  countLogsByLevel,
  exportLogsAsJson,
  copyLogsToClipboard,
  createSampleLogs
};