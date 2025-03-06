// Main container component
import React from 'react';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import LogContent from './components/LogContent';
import { parseLogsByType, filterLogs, countLogsByLevel, createSampleLogs } from './utils/utils';
import { FilterCriteria, LogEntry, LogType } from '../../types/LogParserTypes';

const LogParserTool: React.FC = () => {
  const [logText, setLogText] = React.useState<string>('');
  const [parsedLogs, setParsedLogs] = React.useState<LogEntry[]>([]);
  const [logType, setLogType] = React.useState<LogType>('auto');
  const [filter, setFilter] = React.useState<string>('');
  const [showFilters, setShowFilters] = React.useState<boolean>(false);
  const [darkMode, setDarkMode] = React.useState<boolean>(false);
  const [activeFilters, setActiveFilters] = React.useState<FilterCriteria['levelFilters']>({
    error: true,
    warn: true,
    info: true,
    debug: true,
    success: true
  });
  const [timeRange, setTimeRange] = React.useState<FilterCriteria['timeRange']>({
    start: undefined,
    end: undefined
  });
  const [searchComponent, setSearchComponent] = React.useState<string>('');

  // Parse logs whenever input text or selected log type changes
  React.useEffect(() => {
    if (logText) {
      const logs = parseLogsByType(logText, logType);
      setParsedLogs(logs);
    } else {
      setParsedLogs([]);
    }
  }, [logText, logType]);

  // Apply filters to logs
  const filteredLogs = filterLogs(parsedLogs, {
    levelFilters: activeFilters,
    textSearch: filter,
    component: searchComponent,
    timeRange: {
      start: timeRange.start,
      end: timeRange.end
    }
  });

  // Toggle a specific log level filter
  const toggleLevelFilter = (level: keyof FilterCriteria['levelFilters']) => {
    setActiveFilters({
      ...activeFilters,
      [level]: !activeFilters[level]
    });
  };

  // Clear the input logs
  const clearLogs = () => {
    setLogText('');
    setParsedLogs([]);
  };

  // Reset filters
  const resetFilters = () => {
    setFilter('');
    setActiveFilters({
      error: true,
      warn: true,
      info: true,
      debug: true,
      success: true
    });
    setTimeRange({
      start: undefined,
      end: undefined
    });
    setSearchComponent('');
  };

  // Load sample logs
  const loadSampleLogs = () => {
    setLogText(createSampleLogs());
  };

  // Get log counts
  const logCounts = countLogsByLevel(parsedLogs);

  return (
    <div className={`flex flex-col min-h-screen p-4 transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header 
        logType={logType} 
        logText={logText} 
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      
      {showFilters && (
        <FilterPanel 
          filter={filter}
          setFilter={setFilter}
          searchComponent={searchComponent}
          setSearchComponent={setSearchComponent}
          logType={logType}
          setLogType={setLogType}
          activeFilters={activeFilters}
          toggleLevelFilter={toggleLevelFilter}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          resetFilters={resetFilters}
          logCounts={logCounts}
          darkMode={darkMode}
        />
      )}
      
      <LogContent 
        logText={logText}
        setLogText={setLogText}
        parsedLogs={parsedLogs}
        filteredLogs={filteredLogs}
        clearLogs={clearLogs}
        loadSampleLogs={loadSampleLogs}
        filter={filter}
        searchComponent={searchComponent}
        resetFilters={resetFilters}
        darkMode={darkMode}
      />
    </div>
  );
};

export default LogParserTool;