import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Download, 
  RefreshCw, 
  LayoutGrid,
  PanelLeft,
  PanelRight,
  Sparkles
} from 'lucide-react';
import { LogContentProps } from '../../../types/LogParserTypes';
import { exportLogsAsJson } from '../utils/utils';
import { useAnimations } from '../hooks/useLogParser';
import LogList from './LogList';
import EmptyState from './EmptyState';
import StatsOverview from './StatsOverview';

const LogContent: React.FC<LogContentProps> = ({
  logText,
  setLogText,
  parsedLogs,
  filteredLogs,
  clearLogs,
  loadSampleLogs,
  filter,
  searchComponent,
  resetFilters,
  darkMode,
  viewMode,
  setViewMode
}) => {
  const { fadeInUp, slideInLeft } = useAnimations();

  const hasFilters = Boolean(filter || searchComponent);

  const viewModeButtons = [
    { mode: 'split' as const, label: 'Split View', icon: <LayoutGrid size={16} /> },
    { mode: 'input' as const, label: 'Input Only', icon: <PanelLeft size={16} /> },
    { mode: 'output' as const, label: 'Output Only', icon: <PanelRight size={16} /> }
  ];

  return (
    <motion.div
    //@ts-expect-error variants are sortof misaligned with the expected types.
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={`flex flex-col flex-1 min-h-0 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      {/* Top Action Bar */}
      <motion.div 
      //@ts-expect-error variants are sortof misaligned with the expected types.
        variants={slideInLeft}
        className={`flex items-center justify-between p-4 border-b backdrop-blur-sm ${
          darkMode 
            ? 'bg-gray-800/50 border-gray-800' 
            : 'bg-white/50 border-gray-200'
        }`}
      >
        {/* View Mode Selector */}
        <div className="flex items-center gap-1">
          {viewModeButtons.map(({ mode, label, icon }) => (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                viewMode === mode
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : darkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </motion.button>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loadSampleLogs}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700' 
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'
            }`}
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Sample Logs</span>
          </motion.button>
        </div>
      </motion.div>
      
      {/* Main Content Area */}
      <div className={`flex-1 flex min-h-0 ${
        viewMode === 'split' ? 'flex-col lg:flex-row' : 'flex-col'
      }`}>
        {/* Input Panel */}
        <AnimatePresence>
          {(viewMode === 'split' || viewMode === 'input') && (
            <motion.div
            //@ts-expect-error variants are sortof misaligned with the expected types.
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`${
                viewMode === 'split' ? 'lg:w-1/2' : 'w-full'
              } flex flex-col p-4 min-h-0`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className={`font-semibold text-lg ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Input Logs
                </h3>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={clearLogs}
                  disabled={!logText}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                    !logText 
                      ? 'opacity-50 cursor-not-allowed' 
                      : darkMode
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  <Trash2 size={14} />
                  Clear
                </motion.button>
              </div>
              
              <motion.div
              //@ts-expect-error variants are sortof misaligned with the expected types.
                variants={fadeInUp}
                className={`flex-1 rounded-xl border-2 border-dashed transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 ${
                  darkMode 
                    ? 'border-gray-700 bg-gray-800/50' 
                    : 'border-gray-300 bg-white'
                }`}
              >
                <textarea 
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  placeholder="Paste your logs here or load a sample to get started..."
                  className={`w-full h-full p-4 font-mono text-sm resize-none bg-transparent focus:outline-none rounded-xl ${
                    darkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                  }`}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Results Panel */}
        <AnimatePresence>
          {(viewMode === 'split' || viewMode === 'output') && (
            <motion.div
            //@ts-expect-error variants are sortof misaligned with the expected types.
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`${
                viewMode === 'split' ? 'lg:w-1/2 lg:border-l' : 'w-full'
              } flex flex-col p-4 min-h-0 ${
                darkMode ? 'lg:border-gray-800' : 'lg:border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className={`font-semibold text-lg ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Results
                  </h3>
                  <motion.span 
                  //@ts-expect-error variants are sortof misaligned with the expected types.
                    variants={fadeInUp}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      darkMode 
                        ? 'bg-indigo-500/20 text-indigo-300' 
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {filteredLogs.length} / {parsedLogs.length}
                  </motion.span>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasFilters && (
                    <motion.button 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={resetFilters}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                        darkMode 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                      <RefreshCw size={14} />
                      Reset Filters
                    </motion.button>
                  )}
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => exportLogsAsJson(filteredLogs)}
                    disabled={filteredLogs.length === 0}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                      filteredLogs.length === 0 
                        ? 'opacity-50 cursor-not-allowed' 
                        : darkMode
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                    }`}
                  >
                    <Download size={14} />
                    Export
                  </motion.button>
                </div>
              </div>
              
              {/* Stats Overview */}
              {parsedLogs.length > 0 && (
                <motion.div 
                //@ts-expect-error variants are sortof misaligned with the expected types.
                variants={fadeInUp} className="mb-4">
                  <StatsOverview logs={parsedLogs} darkMode={darkMode} />
                </motion.div>
              )}
              
              {/* Log List Container */}
              <motion.div
              //@ts-expect-error variants are sortof misaligned with the expected types.
                variants={fadeInUp}
                className={`flex-1 rounded-xl border overflow-hidden ${
                  darkMode 
                    ? 'border-gray-800 bg-gray-900/50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="h-full overflow-hidden">
                  {filteredLogs.length > 0 ? (
                    <LogList 
                      logs={filteredLogs} 
                      darkMode={darkMode}
                    />
                  ) : (
                    <EmptyState 
                      logText={logText} 
                      resetFilters={resetFilters} 
                      loadSampleLogs={loadSampleLogs} 
                      darkMode={darkMode}
                      hasFilters={hasFilters}
                    />
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LogContent;