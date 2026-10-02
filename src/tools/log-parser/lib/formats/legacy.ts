import { detectLevel, normaliseLevel } from '../level';
import type { FormatSpec, LogEntry as NewEntry } from '../model';
import { toEpoch } from '../time';

/** The pre-1.0 parser's entry shape, kept for its line formats. */
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

// Detect log type based on content patterns
export const detectLogType = (text: string): LogType => {
  if (
    text.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?\[(INFO|WARN|ERROR|DEBUG)\]/m,
    )
  ) {
    return 'spring';
  } else if (
    text.match(/^\[\d{4}-\d{2}-\d{2}.*?\] (INFO|WARNING|ERROR|DEBUG)/m)
  ) {
    return 'django';
  } else if (text.match(/^.*?\d+:\d+:\d+ (info|warn|error|debug)/im)) {
    return 'node';
  } else if (text.match(/(INFO|WARN|ERROR|DEBUG) -- /m)) {
    return 'log4j';
  } else if (
    text.includes('Executing SQL') ||
    text.includes('SELECT') ||
    text.includes('INSERT')
  ) {
    return 'sql';
  } else if (
    text.includes('webpack') ||
    text.includes('compiled') ||
    text.includes('chunk')
  ) {
    return 'webpack';
  } else {
    return 'generic';
  }
};

// Main parse function that delegates to specific parsers
export const parseLogsByType = (text: string, type: LogType): LogEntry[] => {
  const actualType = type === 'auto' ? detectLogType(text) : type;
  const lines = text.split('\n').filter((line) => line.trim());

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
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+).*?\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(\s+-\s+(.*))?$/,
    );
    if (match) {
      const [, timestamp, level, component, message, , details] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase() as LogLevel,
        component,
        message,
        details: details || '',
        raw: line,
      };
    }
    return { id: index, level: 'info', message: line, raw: line };
  });
};

// Parser for Django logs
const parseDjangoLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(
      /^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\]\s+(INFO|WARNING|ERROR|DEBUG)\s+(.*?):\s+(.*)$/i,
    );
    if (match) {
      const [, timestamp, level, component, message] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase().replace('warning', 'warn') as LogLevel,
        component,
        message,
        raw: line,
      };
    }
    return { id: index, level: 'info', message: line, raw: line };
  });
};

// Parser for Node.js logs
const parseNodeLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(
      /^(.*?\d{2}:\d{2}:\d{2})\s+(info|warn|error|debug):\s+(.*)$/i,
    );
    if (match) {
      const [, timestamp, level, message] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase() as LogLevel,
        message,
        raw: line,
      };
    }
    return { id: index, level: 'info', message: line, raw: line };
  });
};

// Parser for Log4j logs
const parseLog4jLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+(INFO|WARN|ERROR|DEBUG)\s+\[(.*?)\]\s+(.*)$/i,
    );
    if (match) {
      const [, timestamp, level, component, message] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase() as LogLevel,
        component,
        message,
        raw: line,
      };
    }
    return { id: index, level: 'info', message: line, raw: line };
  });
};

// Parser for SQL logs
const parseSqlLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const timeMatch = line.match(/Executed in (\d+) ms/);
    const executionTime = timeMatch ? timeMatch[1] + 'ms' : undefined;

    let level: LogLevel = 'info';
    if (
      line.toLowerCase().includes('error') ||
      line.toLowerCase().includes('exception')
    ) {
      level = 'error';
    } else if (line.toLowerCase().includes('warn')) {
      level = 'warn';
    }

    return {
      id: index,
      level,
      message: line,
      executionTime,
      raw: line,
    };
  });
};

// Parser for Webpack logs
const parseWebpackLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    let level: LogLevel = 'info';
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
      raw: line,
    };
  });
};

// Parser for Generic logs with best-effort detection
const parseGenericLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    let level: LogLevel = 'info';
    if (
      line.toLowerCase().includes('error') ||
      line.toLowerCase().includes('exception') ||
      line.toLowerCase().includes('fail')
    ) {
      level = 'error';
    } else if (line.toLowerCase().includes('warn')) {
      level = 'warn';
    } else if (line.toLowerCase().includes('debug')) {
      level = 'debug';
    } else if (
      line.toLowerCase().includes('success') ||
      line.toLowerCase().includes('completed successfully')
    ) {
      level = 'success';
    }

    const timestampMatch = line.match(
      /\d{4}[-/]\d{2}[-/]\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?/,
    );
    const timestamp = timestampMatch ? timestampMatch[0] : undefined;

    return {
      id: index,
      timestamp,
      level,
      message: line,
      raw: line,
    };
  });
};

// The legacy formats as line-level FormatSpecs for the Log Viewer store.

const lower = (level: string) => level.toLowerCase().replace('warning', 'warn');

const legacy = (
  id: string,
  label: string,
  re: RegExp,
  map: (m: RegExpExecArray) => Partial<NewEntry>,
): FormatSpec => ({
  id,
  label,
  parse(line) {
    const m = re.exec(line);
    return m ? map(m) : null;
  },
});

export const spring = legacy(
  'spring',
  'Spring Boot',
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+).*?\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(?:\s+-\s+(.*))?$/,
  ([, ts, level, component, message, details]) => ({
    ts: toEpoch(ts),
    level: normaliseLevel(level),
    component,
    message,
    fields: details ? { details } : undefined,
  }),
);

export const django = legacy(
  'django',
  'Django',
  /^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\]\s+(INFO|WARNING|ERROR|DEBUG|CRITICAL)\s+(.*?):\s+(.*)$/i,
  ([, ts, level, component, message]) => ({
    ts: toEpoch(ts),
    level: normaliseLevel(lower(level)),
    component,
    message,
  }),
);

export const node = legacy(
  'node',
  'Node.js',
  /^(.*?\d{2}:\d{2}:\d{2})\s+(info|warn|error|debug):\s+(.*)$/i,
  ([, ts, level, message]) => ({
    ts: toEpoch(ts),
    level: normaliseLevel(level),
    message,
  }),
);

export const log4j = legacy(
  'log4j',
  'log4j',
  /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+(INFO|WARN|ERROR|DEBUG|TRACE|FATAL)\s+\[(.*?)\]\s+(.*)$/i,
  ([, ts, level, component, message]) => ({
    ts: toEpoch(ts),
    level: normaliseLevel(level),
    component,
    message,
  }),
);

export const sql = legacy(
  'sql',
  'SQL',
  /^.*\b(?:Executing SQL|SELECT|INSERT|UPDATE|DELETE)\b.*$/,
  ([line]) => ({
    level: normaliseLevel(detectLevel(line)) ?? 'info',
    message: line,
    fields: /Executed in (\d+) ms/.exec(line)
      ? { duration: `${/Executed in (\d+) ms/.exec(line)![1]} ms` }
      : undefined,
  }),
);

export const webpack = legacy(
  'webpack',
  'webpack',
  /^.*\b(?:webpack|compiled|chunk|asset)\b.*$/i,
  ([line]) => ({
    level: /\bERROR\b/.test(line)
      ? 'error'
      : /\bWARNING\b/.test(line)
        ? 'warn'
        : /\bsuccess/i.test(line)
          ? 'success'
          : 'info',
    message: line,
  }),
);

export const LEGACY_FORMATS = [spring, django, node, log4j, sql, webpack];
