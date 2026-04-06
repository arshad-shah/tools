import {
  FilterCriteria,
  LogCounts,
  LogEntry,
  LogType,
  LogLevel,
} from "../../../types/LogParserTypes";

// Detect log type based on content patterns
export const detectLogType = (text: string): LogType => {
  if (
    text.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?\[(INFO|WARN|ERROR|DEBUG)\]/m
    )
  ) {
    return "spring";
  } else if (
    text.match(/^\[\d{4}-\d{2}-\d{2}.*?\] (INFO|WARNING|ERROR|DEBUG)/m)
  ) {
    return "django";
  } else if (text.match(/^.*?\d+:\d+:\d+ (info|warn|error|debug)/im)) {
    return "node";
  } else if (text.match(/(INFO|WARN|ERROR|DEBUG) -- /m)) {
    return "log4j";
  } else if (
    text.includes("Executing SQL") ||
    text.includes("SELECT") ||
    text.includes("INSERT")
  ) {
    return "sql";
  } else if (
    text.includes("webpack") ||
    text.includes("compiled") ||
    text.includes("chunk")
  ) {
    return "webpack";
  } else {
    return "generic";
  }
};

// Main parse function that delegates to specific parsers
export const parseLogsByType = (text: string, type: LogType): LogEntry[] => {
  const actualType = type === "auto" ? detectLogType(text) : type;
  const lines = text.split("\n").filter((line) => line.trim());

  switch (actualType) {
    case "spring":
      return parseSpringLogs(lines);
    case "django":
      return parseDjangoLogs(lines);
    case "node":
      return parseNodeLogs(lines);
    case "log4j":
      return parseLog4jLogs(lines);
    case "sql":
      return parseSqlLogs(lines);
    case "webpack":
      return parseWebpackLogs(lines);
    default:
      return parseGenericLogs(lines);
  }
};

// Parser for Spring Boot logs
const parseSpringLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+).*?\[(.*?)\]\s+\[(.*?)\]\s+(.*?)(\s+-\s+(.*))?$/
    );
    if (match) {
      const [, timestamp, level, component, message, , details] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase() as LogLevel,
        component,
        message,
        details: details || "",
        raw: line,
      };
    }
    return { id: index, level: "info", message: line, raw: line };
  });
};

// Parser for Django logs
const parseDjangoLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(
      /^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\]\s+(INFO|WARNING|ERROR|DEBUG)\s+(.*?):\s+(.*)$/i
    );
    if (match) {
      const [, timestamp, level, component, message] = match;
      return {
        id: index,
        timestamp,
        level: level.toLowerCase().replace("warning", "warn") as LogLevel,
        component,
        message,
        raw: line,
      };
    }
    return { id: index, level: "info", message: line, raw: line };
  });
};

// Parser for Node.js logs
const parseNodeLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(
      /^(.*?\d{2}:\d{2}:\d{2})\s+(info|warn|error|debug):\s+(.*)$/i
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
    return { id: index, level: "info", message: line, raw: line };
  });
};

// Parser for Log4j logs
const parseLog4jLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)\s+(INFO|WARN|ERROR|DEBUG)\s+\[(.*?)\]\s+(.*)$/i
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
    return { id: index, level: "info", message: line, raw: line };
  });
};

// Parser for SQL logs
const parseSqlLogs = (lines: string[]): LogEntry[] => {
  return lines.map((line, index) => {
    const timeMatch = line.match(/Executed in (\d+) ms/);
    const executionTime = timeMatch ? timeMatch[1] + "ms" : undefined;

    let level: LogLevel = "info";
    if (
      line.toLowerCase().includes("error") ||
      line.toLowerCase().includes("exception")
    ) {
      level = "error";
    } else if (line.toLowerCase().includes("warn")) {
      level = "warn";
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
    let level: LogLevel = "info";
    if (line.includes("ERROR")) {
      level = "error";
    } else if (line.includes("WARNING")) {
      level = "warn";
    } else if (line.includes("success")) {
      level = "success";
    }

    const match = line.match(/in (\d+) ms/);
    const buildTime = match ? match[1] + "ms" : undefined;

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
    let level: LogLevel = "info";
    if (
      line.toLowerCase().includes("error") ||
      line.toLowerCase().includes("exception") ||
      line.toLowerCase().includes("fail")
    ) {
      level = "error";
    } else if (line.toLowerCase().includes("warn")) {
      level = "warn";
    } else if (line.toLowerCase().includes("debug")) {
      level = "debug";
    } else if (
      line.toLowerCase().includes("success") ||
      line.toLowerCase().includes("completed successfully")
    ) {
      level = "success";
    }

    const timestampMatch = line.match(
      /\d{4}[-/]\d{2}[-/]\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?/
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

// Filter logs based on criteria
export const filterLogs = (
  logs: LogEntry[],
  criteria: FilterCriteria
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
        const logTime = new Date(log.timestamp.replace(",", "."));
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
        const logTime = new Date(log.timestamp.replace(",", "."));
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
    error: logs.filter((log) => log.level === "error").length,
    warn: logs.filter((log) => log.level === "warn").length,
    info: logs.filter((log) => log.level === "info").length,
    debug: logs.filter((log) => log.level === "debug").length,
    success: logs.filter((log) => log.level === "success").length,
  };
};

// Export logs as JSON
export const exportLogsAsJson = (logs: LogEntry[]): void => {
  const dataStr = JSON.stringify(logs, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = "parsed_logs.json";

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
};

// Copy logs to clipboard
export const copyLogsToClipboard = (logs: LogEntry[]): Promise<void> => {
  return navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
};

// Sample log creator for testing
export const createSampleLogs = (): string => {
  return `2024-01-15T08:23:45.123 [INFO] [com.example.UserService] User authentication successful - userId=12345
2024-01-15T08:23:46.456 [WARN] [com.example.SecurityFilter] Suspicious login attempt detected from IP 192.168.1.10
2024-01-15T08:24:01.789 [ERROR] [com.example.DatabaseService] Failed to connect to database - java.sql.SQLException: Connection refused
2024-01-15T08:24:05.234 [DEBUG] [com.example.ConfigLoader] Loading application properties from /etc/app/config.properties
2024-01-15T08:24:10.567 [INFO] [com.example.StartupManager] Application started in 3.45 seconds
2024-01-15T08:24:15.890 [SUCCESS] [com.example.HealthCheck] All system checks passed
2024-01-15T08:24:20.123 [WARN] [com.example.CacheService] Cache miss for key: user_preferences_12345
2024-01-15T08:24:25.456 [INFO] [com.example.ApiController] Processing request: GET /api/users/12345
2024-01-15T08:24:30.789 [ERROR] [com.example.ValidationService] Invalid email format: user@invalid - Expected valid email address
2024-01-15T08:24:35.012 [DEBUG] [com.example.TokenService] JWT token validation completed in 15ms`;
};

// Get log level configurations for styling
export const getLogLevelConfig = (level: LogLevel) => {
  const configs = {
    error: {
      color: "text-red-500",
      darkColor: "text-red-400",
      bgColor: "bg-red-50",
      darkBgColor: "bg-red-500/10",
      borderColor: "border-red-200",
      darkBorderColor: "border-red-500/30",
      textColor: "text-red-700",
      darkTextColor: "text-red-300",
    },
    warn: {
      color: "text-amber-500",
      darkColor: "text-amber-400",
      bgColor: "bg-amber-50",
      darkBgColor: "bg-amber-500/10",
      borderColor: "border-amber-200",
      darkBorderColor: "border-amber-500/30",
      textColor: "text-amber-700",
      darkTextColor: "text-amber-300",
    },
    info: {
      color: "text-blue-500",
      darkColor: "text-blue-400",
      bgColor: "bg-blue-50",
      darkBgColor: "bg-blue-500/10",
      borderColor: "border-blue-200",
      darkBorderColor: "border-blue-500/30",
      textColor: "text-blue-700",
      darkTextColor: "text-blue-300",
    },
    debug: {
      color: "text-purple-500",
      darkColor: "text-purple-400",
      bgColor: "bg-purple-50",
      darkBgColor: "bg-purple-500/10",
      borderColor: "border-purple-200",
      darkBorderColor: "border-purple-500/30",
      textColor: "text-purple-700",
      darkTextColor: "text-purple-300",
    },
    success: {
      color: "text-emerald-500",
      darkColor: "text-emerald-400",
      bgColor: "bg-emerald-50",
      darkBgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-200",
      darkBorderColor: "border-emerald-500/30",
      textColor: "text-emerald-700",
      darkTextColor: "text-emerald-300",
    },
  };

  return configs[level];
};
