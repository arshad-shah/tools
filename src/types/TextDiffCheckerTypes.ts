export interface DiffSegment {
  text: string;
  added?: boolean;
  removed?: boolean;
  changed?: boolean;
  lineNumber?: number;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
  type?: "added" | "removed" | "changed" | "unchanged";
  isIntraline?: boolean;
  intraChanges?: Array<{
    start: number;
    end: number;
    type: "added" | "removed";
  }>;
}

export interface DiffViewMode {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export interface DiffStatistics {
  additions: number;
  deletions: number;
  changes: number;
  unchanged: number;
  totalLines: number;
  changePercentage: number;
}

export interface DiffSettings {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  wordByWord: boolean;
  showLineNumbers: boolean;
  contextLines: number;
  trimTrailingWhitespace: boolean;
  highlightIntralineChanges: boolean;
  syntaxHighlighting: boolean;
  ignoreEmptyLines: boolean;
  trimNewlines: boolean;
}

export interface NotificationProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
}

export interface UseIntelligentDiffReturn {
  diffSegments: DiffSegment[];
  diffStats: DiffStatistics | null;
  isDiffing: boolean;
  performanceWarning: boolean;
  calculateDiff: (
    leftText: string,
    rightText: string,
    settings: DiffSettings,
    highlightMode?: "character" | "word" | "line"
  ) => void;
  debouncedCalculateDiff: (
    leftText: string,
    rightText: string,
    settings: DiffSettings,
    highlightMode?: "character" | "word" | "line"
  ) => void;
  clearDiff: () => void;
}