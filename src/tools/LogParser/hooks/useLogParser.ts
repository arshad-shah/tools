import { useState, useEffect, useCallback } from "react";
import {
  LogEntry,
  LogType,
  FilterCriteria,
  LogCounts,
  ViewMode,
} from "../../../types/LogParserTypes";
import {
  parseLogsByType,
  filterLogs,
  countLogsByLevel,
  createSampleLogs,
} from "../utils/utils";

export const useLogParser = () => {
  // Core state
  const [logText, setLogText] = useState<string>("");
  const [parsedLogs, setParsedLogs] = useState<LogEntry[]>([]);
  const [logType, setLogType] = useState<LogType>("auto");

  // UI state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("darkMode") === "true" ||
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
    return false;
  });

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode["mode"]>("split");
  const [expandedLogs, setExpandedLogs] = useState<{ [id: string]: boolean }>(
    {}
  );

  // Filter state
  const [filter, setFilter] = useState<string>("");
  const [searchComponent, setSearchComponent] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<
    FilterCriteria["levelFilters"]
  >({
    error: true,
    warn: true,
    info: true,
    debug: true,
    success: true,
  });
  const [timeRange, setTimeRange] = useState<FilterCriteria["timeRange"]>({
    start: undefined,
    end: undefined,
  });

  // Parse logs whenever input text or log type changes
  useEffect(() => {
    if (logText.trim()) {
      const logs = parseLogsByType(logText, logType);
      setParsedLogs(logs);
    } else {
      setParsedLogs([]);
    }
  }, [logText, logType]);

  // Persist dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Apply filters to get filtered logs
  const filteredLogs = filterLogs(parsedLogs, {
    levelFilters: activeFilters,
    textSearch: filter,
    component: searchComponent,
    timeRange,
  });

  // Get log counts
  const logCounts: LogCounts = countLogsByLevel(parsedLogs);

  // Toggle a specific log level filter
  const toggleLevelFilter = useCallback(
    (level: keyof FilterCriteria["levelFilters"]) => {
      setActiveFilters((prev) => ({
        ...prev,
        [level]: !prev[level],
      }));
    },
    []
  );

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogText("");
    setParsedLogs([]);
    setExpandedLogs({});
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilter("");
    setSearchComponent("");
    setActiveFilters({
      error: true,
      warn: true,
      info: true,
      debug: true,
      success: true,
    });
    setTimeRange({
      start: undefined,
      end: undefined,
    });
  }, []);

  // Load sample logs
  const loadSampleLogs = useCallback(() => {
    setLogText(createSampleLogs());
  }, []);

  // Toggle expanded state for a log entry
  const toggleLogExpanded = useCallback((logId: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  }, []);

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    filter ||
      searchComponent ||
      timeRange.start ||
      timeRange.end ||
      !Object.values(activeFilters).every(Boolean)
  );

  return {
    // State
    logText,
    setLogText,
    parsedLogs,
    filteredLogs,
    logType,
    setLogType,
    darkMode,
    setDarkMode,
    showFilters,
    setShowFilters,
    viewMode,
    setViewMode,
    expandedLogs,

    // Filters
    filter,
    setFilter,
    searchComponent,
    setSearchComponent,
    activeFilters,
    timeRange,
    setTimeRange,

    // Computed values
    logCounts,
    hasActiveFilters,

    // Actions
    toggleLevelFilter,
    clearLogs,
    resetFilters,
    loadSampleLogs,
    toggleLogExpanded,
  };
};

// Hook for managing copy to clipboard functionality
export const useCopyToClipboard = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      console.error("Failed to copy text:", error);
      return false;
    }
  }, []);

  return { copied, copyToClipboard };
};

// Hook for managing animations
export const useAnimations = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
  };

  const slideInLeft = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" },
    },
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  return {
    fadeInUp,
    fadeIn,
    slideInLeft,
    scaleIn,
    staggerChildren,
  };
};
