import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  X,
  Tag,
  List,
  Clock,
  RefreshCw,
  Filter,
  AlertCircle,
  Info,
  Cpu,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { FilterPanelProps, LogLevel, LogType } from '../../../types/LogParserTypes';
import { getLogLevelConfig } from '../utils/utils';
import { useAnimations } from '../hooks/useLogParser';

const FilterPanel: React.FC<FilterPanelProps> = ({
  filter,
  setFilter,
  searchComponent,
  setSearchComponent,
  logType,
  setLogType,
  activeFilters,
  toggleLevelFilter,
  timeRange,
  setTimeRange,
  resetFilters,
  logCounts,
  darkMode
}) => {
  const { fadeInUp, staggerChildren, scaleIn } = useAnimations();

  // Log level configurations
  const logLevels: { level: LogLevel; icon: React.ReactNode; label: string }[] = [
    { level: 'error', icon: <AlertCircle size={14} />, label: 'Errors' },
    { level: 'warn', icon: <AlertTriangle size={14} />, label: 'Warnings' },
    { level: 'info', icon: <Info size={14} />, label: 'Info' },
    { level: 'debug', icon: <Cpu size={14} />, label: 'Debug' },
    { level: 'success', icon: <CheckCircle size={14} />, label: 'Success' }
  ];

  const hasActiveFilters = Boolean(
    filter || 
    searchComponent || 
    timeRange.start || 
    timeRange.end ||
    !Object.values(activeFilters).every(Boolean)
  );

  return (
    <AnimatePresence>
      <motion.div
      //@ts-expect-error variants are sortof misaligned with the expected types.
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className={`relative mb-6 overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
          darkMode 
            ? 'bg-gray-900/50 border-gray-800 shadow-xl shadow-gray-900/20' 
            : 'bg-white/80 border-gray-200 shadow-xl shadow-gray-900/5'
        }`}
      >
        {/* Gradient Background Overlay */}
        <div className={`absolute inset-0 ${
          darkMode 
            ? 'bg-gradient-to-r from-indigo-600/5 via-transparent to-purple-600/5' 
            : 'bg-gradient-to-r from-indigo-50/50 via-transparent to-purple-50/50'
        }`} />
        
        <div className="relative p-6">
          {/* Header */}
          <motion.div 
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
            className="flex justify-between items-center mb-6"
          >
            <motion.h2 
            //@ts-expect-error variants are sortof misaligned with the expected types.
              variants={scaleIn}
              className={`font-bold text-xl flex items-center gap-3 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                <Filter size={20} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
              </div>
              Filter Options
            </motion.h2>
            
            <motion.button 
            //@ts-expect-error variants are sortof misaligned with the expected types.
              variants={scaleIn}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                hasActiveFilters
                  ? darkMode
                    ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  : 'opacity-50 cursor-not-allowed bg-gray-500/10 text-gray-500'
              }`}
            >
              <RefreshCw size={14} />
              Reset All
            </motion.button>
          </motion.div>
          
          {/* Main Filter Grid */}
          <motion.div 
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
          >
            {/* Text Search */}
            <motion.div 
            //@ts-expect-error variants are sortof misaligned with the expected types.
            variants={scaleIn} className="space-y-3">
              <label className={`flex items-center gap-2 text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Search size={16} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                Text Search
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search in logs..."
                  className={`w-full p-3 pl-10 pr-10 rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 hover:border-gray-600' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 hover:border-gray-300'
                  }`}
                />
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                  darkMode ? 'text-gray-400 group-focus-within:text-indigo-400' : 'text-gray-500 group-focus-within:text-indigo-600'
                }`} size={16} />
                {filter && (
                  <motion.button 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFilter('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={14} />
                  </motion.button>
                )}
              </div>
            </motion.div>
            
            {/* Component Filter */}
            <motion.div 
            //@ts-expect-error variants are sortof misaligned with the expected types.
            variants={scaleIn} className="space-y-3">
              <label className={`flex items-center gap-2 text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Tag size={16} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                Component Filter
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  value={searchComponent}
                  onChange={(e) => setSearchComponent(e.target.value)}
                  placeholder="Filter by component..."
                  className={`w-full p-3 pl-10 pr-10 rounded-xl border-2 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 hover:border-gray-600' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 hover:border-gray-300'
                  }`}
                />
                <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                  darkMode ? 'text-gray-400 group-focus-within:text-indigo-400' : 'text-gray-500 group-focus-within:text-indigo-600'
                }`} size={16} />
                {searchComponent && (
                  <motion.button 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearchComponent('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className={darkMode ? 'text-gray-400' : 'text-gray-500'} size={14} />
                  </motion.button>
                )}
              </div>
            </motion.div>
            
            {/* Log Type */}
            <motion.div 
            //@ts-expect-error variants are sortof misaligned with the expected types.
            variants={scaleIn} className="space-y-3">
              <label className={`flex items-center gap-2 text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <List size={16} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                Log Type
              </label>
              <div className="relative">
                <select 
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as LogType)}
                  className={`w-full p-3 pl-10 rounded-xl border-2 appearance-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none ${
                    darkMode 
                      ? 'bg-gray-800/50 border-gray-700 text-white hover:border-gray-600' 
                      : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <option value="auto">Auto Detect</option>
                  <option value="spring">Spring Boot</option>
                  <option value="django">Django</option>
                  <option value="node">Node.js</option>
                  <option value="log4j">Log4j</option>
                  <option value="sql">SQL Queries</option>
                  <option value="webpack">Webpack</option>
                  <option value="generic">Generic</option>
                </select>
                <List className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`} size={16} />
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Log Levels and Time Range */}
          <motion.div 
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 xl:grid-cols-2 gap-6"
          >
            {/* Log Levels */}
            <motion.div 
            //@ts-expect-error variants are sortof misaligned with the expected types.
            variants={scaleIn} className="space-y-3">
              <label className={`flex items-center gap-2 text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <List size={16} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                Log Levels
              </label>
              <div className="flex flex-wrap gap-2">
                {logLevels.map(({ level, icon, label }) => (
                  <LevelFilterButton 
                    key={level}
                    level={level}
                    icon={icon}
                    label={label}
                    count={logCounts[level]}
                    active={activeFilters[level]}
                    onClick={() => toggleLevelFilter(level)}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            </motion.div>
            
            {/* Time Range */}
            <motion.div 
            //@ts-expect-error variants are sortof misaligned with the expected types.
            variants={scaleIn} className="space-y-3">
              <label className={`flex items-center gap-2 text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Clock size={16} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                Time Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>From</label>
                  <input 
                    type="datetime-local"
                    value={timeRange.start || ''}
                    onChange={(e) => setTimeRange({...timeRange, start: e.target.value})}
                    className={`w-full p-2.5 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none ${
                      darkMode 
                        ? 'bg-gray-800/50 border-gray-700 text-white hover:border-gray-600' 
                        : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>To</label>
                  <input 
                    type="datetime-local"
                    value={timeRange.end || ''}
                    onChange={(e) => setTimeRange({...timeRange, end: e.target.value})}
                    className={`w-full p-2.5 rounded-lg border-2 transition-all duration-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none ${
                      darkMode 
                        ? 'bg-gray-800/50 border-gray-700 text-white hover:border-gray-600' 
                        : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Level Filter Button Component
interface LevelFilterButtonProps {
  level: LogLevel;
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  darkMode: boolean;
}

const LevelFilterButton: React.FC<LevelFilterButtonProps> = ({ 
  level, 
  icon, 
  label,
  count, 
  active, 
  onClick, 
  darkMode
}) => {
  const config = getLogLevelConfig(level);
  
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 border-2 ${
        active
          ? darkMode 
            ? `${config.darkBgColor} ${config.darkTextColor} ${config.darkBorderColor} shadow-lg` 
            : `${config.bgColor} ${config.textColor} ${config.borderColor} shadow-lg`
          : darkMode 
            ? 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-700/50' 
            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
      }`}
    >
      <span className={active ? (darkMode ? config.darkColor : config.color) : undefined}>
        {icon}
      </span>
      {label}
      <motion.span 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`inline-flex items-center justify-center rounded-full text-xs font-bold px-2 py-0.5 min-w-[24px] ${
          active
            ? darkMode 
              ? 'bg-gray-900/30 text-gray-200' 
              : 'bg-white/80 text-gray-700'
            : darkMode 
              ? 'bg-gray-700 text-gray-300' 
              : 'bg-white text-gray-600'
        }`}
      >
        {count}
      </motion.span>
    </motion.button>
  );
};

export default FilterPanel;