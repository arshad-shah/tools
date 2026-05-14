import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import LogContent from './components/LogContent';
import { useLogParser, useAnimations } from './hooks/useLogParser';

const LogParserTool: React.FC = () => {
  const {
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
    
    // Actions
    toggleLevelFilter,
    clearLogs,
    resetFilters,
    loadSampleLogs,
  } = useLogParser();

  const { fadeIn } = useAnimations();

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className={`min-h-screen transition-colors duration-300 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800' 
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
      }`}
    >
      {/* Background Pattern */}
      <div className={`fixed inset-0 opacity-30 ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, ${
            darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
          } 2px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen max-w-[2000px] mx-auto">
        {/* Header */}
        <Header 
          logType={logType} 
          logText={logText} 
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          totalLogs={parsedLogs.length}
          filteredCount={filteredLogs.length}
        />
        
        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <div className="px-6">
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
            </div>
          )}
        </AnimatePresence>
        
        {/* Main Content */}
        <div className="flex-1 px-6 pb-6">
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
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </div>
      </div>

      {/* Scroll to top button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all duration-200 ${
          darkMode 
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25' 
            : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/25'
        }`}
        aria-label="Scroll to top"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path 
            d="M10 3L3 10H7V17H13V10H17L10 3Z" 
            fill="currentColor"
          />
        </svg>
      </motion.button>
    </motion.div>
  );
};

export default LogParserTool;