import { useState, useCallback, useMemo } from 'react';
import type { LogType, FilterCriteria, LogCounts, ViewMode } from '../types';
import { parseLogsByType } from '../lib/parse';
import { filterLogs, countLogsByLevel } from '../lib/filter';
import { createSampleLogs } from '../lib/levels';

export const useLogParser = () => {
  // Core state
  const [logText, setLogText] = useState<string>('');
  const [logType, setLogType] = useState<LogType>('auto');

  // UI state
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode['mode']>('split');
  const [expandedLogs, setExpandedLogs] = useState<{ [id: string]: boolean }>(
    {},
  );

  // Filter state
  const [filter, setFilter] = useState<string>('');
  const [searchComponent, setSearchComponent] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<
    FilterCriteria['levelFilters']
  >({
    error: true,
    warn: true,
    info: true,
    debug: true,
    success: true,
  });
  const [timeRange, setTimeRange] = useState<FilterCriteria['timeRange']>({
    start: undefined,
    end: undefined,
  });

  // Parsed logs are derived from the input text and log type
  const parsedLogs = useMemo(
    () => (logText.trim() ? parseLogsByType(logText, logType) : []),
    [logText, logType],
  );

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
    (level: keyof FilterCriteria['levelFilters']) => {
      setActiveFilters((prev) => ({
        ...prev,
        [level]: !prev[level],
      }));
    },
    [],
  );

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogText('');
    setExpandedLogs({});
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilter('');
    setSearchComponent('');
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
    !Object.values(activeFilters).every(Boolean),
  );

  return {
    // State
    logText,
    setLogText,
    parsedLogs,
    filteredLogs,
    logType,
    setLogType,
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
