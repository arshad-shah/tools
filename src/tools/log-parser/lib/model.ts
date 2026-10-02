/** One log entry (spec §8.1); multi-line entries keep every line in `raw`. */
export interface LogEntry {
  /** Position in the whole log (0-based). */
  index: number;
  /** First source line (1-based). */
  line: number;
  /** Epoch milliseconds. */
  ts?: number;
  /** Canonical level: fatal, error, warn, info, debug, trace or success. */
  level?: string;
  component?: string;
  message: string;
  fields?: Record<string, string>;
  raw: string;
}

/** A log line format: `parse` returns null when the line does not fit. */
export interface FormatSpec {
  id: string;
  label: string;
  parse(line: string): Partial<LogEntry> | null;
}

/** How the UI names a format across the worker boundary. */
export type FormatRef =
  | { kind: 'auto' }
  | { kind: 'builtin'; id: string }
  | { kind: 'custom'; name: string; pattern: string; flags: string };

export const LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'success',
] as const;
