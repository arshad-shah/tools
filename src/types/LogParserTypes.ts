// Core types for the log parser application

export type LogLevel = "error" | "warn" | "info" | "debug" | "success";

export type LogType =
  | "spring"
  | "django"
  | "node"
  | "log4j"
  | "sql"
  | "webpack"
  | "generic"
  | "auto";

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

export interface LogLevelConfig {
  color: string;
  darkColor: string;
  bgColor: string;
  darkBgColor: string;
  borderColor: string;
  darkBorderColor: string;
  textColor: string;
  darkTextColor: string;
}

export interface ViewMode {
  mode: "split" | "input" | "output";
}

// Animation variants for Framer Motion
export interface AnimationVariants {
  hidden: {
    opacity: number;
    y?: number;
    x?: number;
    scale?: number;
  };
  visible: {
    opacity: number;
    y?: number;
    x?: number;
    scale?: number;
    transition?: {
      duration?: number;
      delay?: number;
      type?: string;
      stiffness?: number;
    };
  };
}

// Component Props Interfaces
export interface HeaderProps {
  logType: LogType;
  logText: string;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  totalLogs: number;
  filteredCount: number;
}

export interface FilterPanelProps {
  filter: string;
  setFilter: (filter: string) => void;
  searchComponent: string;
  setSearchComponent: (component: string) => void;
  logType: LogType;
  setLogType: (type: LogType) => void;
  activeFilters: FilterCriteria["levelFilters"];
  toggleLevelFilter: (level: keyof FilterCriteria["levelFilters"]) => void;
  timeRange: FilterCriteria["timeRange"];
  setTimeRange: (range: FilterCriteria["timeRange"]) => void;
  resetFilters: () => void;
  logCounts: LogCounts;
  darkMode: boolean;
}

export interface LogContentProps {
  logText: string;
  setLogText: (text: string) => void;
  parsedLogs: LogEntry[];
  filteredLogs: LogEntry[];
  clearLogs: () => void;
  loadSampleLogs: () => void;
  filter: string;
  searchComponent: string;
  resetFilters: () => void;
  darkMode: boolean;
  viewMode: ViewMode["mode"];
  setViewMode: (mode: ViewMode["mode"]) => void;
}

export interface LogEntryCardProps {
  log: LogEntry;
  darkMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCopy: () => void;
}

export interface EmptyStateProps {
  logText: string;
  resetFilters: () => void;
  loadSampleLogs: () => void;
  darkMode: boolean;
  hasFilters: boolean;
}

export interface StatsCardProps {
  label: string;
  count: number;
  level: LogLevel;
  darkMode: boolean;
  active: boolean;
  onClick: () => void;
}
