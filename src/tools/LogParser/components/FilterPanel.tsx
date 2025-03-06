// FilterPanel.tsx
import React from 'react';
import { 
  RefreshCw, 
  AlertCircle, 
  Info, 
  Cpu, 
  CheckCircle, 
  X, 
  Search,
  Clock,
  Filter,
  Tag,
  List
} from 'lucide-react';
import { FilterCriteria, LogCounts, LogType } from '../../../types/LogParserTypes';

interface FilterPanelProps {
  filter: string;
  setFilter: (filter: string) => void;
  searchComponent: string;
  setSearchComponent: (component: string) => void;
  logType: LogType;
  setLogType: (type: LogType) => void;
  activeFilters: FilterCriteria['levelFilters'];
  toggleLevelFilter: (level: keyof FilterCriteria['levelFilters']) => void;
  timeRange: FilterCriteria['timeRange'];
  setTimeRange: (range: FilterCriteria['timeRange']) => void;
  resetFilters: () => void;
  logCounts: LogCounts;
  darkMode: boolean;
}

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
  const baseColors = {
    error: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', icon: 'text-rose-500', darkBg: 'bg-rose-900 bg-opacity-30', darkText: 'text-rose-400' },
    warn: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: 'text-amber-500', darkBg: 'bg-amber-900 bg-opacity-30', darkText: 'text-amber-400' },
    info: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300', icon: 'text-sky-500', darkBg: 'bg-sky-900 bg-opacity-30', darkText: 'text-sky-400' },
    debug: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', icon: 'text-violet-500', darkBg: 'bg-violet-900 bg-opacity-30', darkText: 'text-violet-400' },
    success: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', icon: 'text-emerald-500', darkBg: 'bg-emerald-900 bg-opacity-30', darkText: 'text-emerald-400' }
  };

  return (
    <div className={`mb-6 p-5 rounded-xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`font-bold text-lg flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          <Filter size={18} className={`mr-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          Filter Options
        </h2>
        <button 
          onClick={resetFilters}
          className={`text-sm px-3 py-1.5 rounded-lg flex items-center transition-colors ${
            darkMode 
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <RefreshCw size={14} className="mr-1.5" />
          Reset All
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <Search size={15} className={`mr-1.5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            Text Search
          </label>
          <div className="relative">
            <input 
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search in logs..."
              className={`w-full p-2.5 pl-9 rounded-lg border transition-colors focus:ring-2 focus:outline-none ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-opacity-50 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 focus:ring-indigo-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <Search className={`absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={16} />
            {filter && (
              <button 
                onClick={() => setFilter('')}
                className="absolute right-3 top-3"
              >
                <X className={`${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} transition-colors`} size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <Tag size={15} className={`mr-1.5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            Component Filter
          </label>
          <div className="relative">
            <input 
              type="text"
              value={searchComponent}
              onChange={(e) => setSearchComponent(e.target.value)}
              placeholder="Filter by component..."
              className={`w-full p-2.5 pl-9 rounded-lg border transition-colors focus:ring-2 focus:outline-none ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-opacity-50 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 focus:ring-indigo-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <Tag className={`absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={16} />
            {searchComponent && (
              <button 
                onClick={() => setSearchComponent('')}
                className="absolute right-3 top-3"
              >
                <X className={`${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} transition-colors`} size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <List size={15} className={`mr-1.5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            Log Type
          </label>
          <div className="relative">
            <select 
              value={logType}
              onChange={(e) => setLogType(e.target.value as LogType)}
              className={`w-full p-2.5 pl-9 rounded-lg border appearance-none transition-colors focus:ring-2 focus:outline-none ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-opacity-50 text-white' 
                  : 'bg-white border-gray-300 focus:ring-indigo-300 text-gray-900'
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
            <List className={`absolute left-3 top-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={16} />
            <div className={`absolute right-3 top-3 pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <List size={15} className={`mr-1.5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            Log Levels
          </label>
          <div className="flex flex-wrap gap-2">
            <LevelFilterButton 
              level="error"
              icon={<AlertCircle size={14} className={`mr-1.5 ${darkMode ? baseColors.error.darkText : baseColors.error.icon}`} />}
              count={logCounts.error}
              active={activeFilters.error}
              onClick={() => toggleLevelFilter('error')}
              darkMode={darkMode}
              colors={baseColors.error}
            />
            
            <LevelFilterButton 
              level="warn"
              icon={<Info size={14} className={`mr-1.5 ${darkMode ? baseColors.warn.darkText : baseColors.warn.icon}`} />}
              count={logCounts.warn}
              active={activeFilters.warn}
              onClick={() => toggleLevelFilter('warn')}
              darkMode={darkMode}
              colors={baseColors.warn}
            />
            
            <LevelFilterButton 
              level="info"
              icon={<Info size={14} className={`mr-1.5 ${darkMode ? baseColors.info.darkText : baseColors.info.icon}`} />}
              count={logCounts.info}
              active={activeFilters.info}
              onClick={() => toggleLevelFilter('info')}
              darkMode={darkMode}
              colors={baseColors.info}
            />
            
            <LevelFilterButton 
              level="debug"
              icon={<Cpu size={14} className={`mr-1.5 ${darkMode ? baseColors.debug.darkText : baseColors.debug.icon}`} />}
              count={logCounts.debug}
              active={activeFilters.debug}
              onClick={() => toggleLevelFilter('debug')}
              darkMode={darkMode}
              colors={baseColors.debug}
            />
            
            <LevelFilterButton 
              level="success"
              icon={<CheckCircle size={14} className={`mr-1.5 ${darkMode ? baseColors.success.darkText : baseColors.success.icon}`} />}
              count={logCounts.success}
              active={activeFilters.success}
              onClick={() => toggleLevelFilter('success')}
              darkMode={darkMode}
              colors={baseColors.success}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className={`flex items-center text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <Clock size={15} className={`mr-1.5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            Time Range
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input 
                type="datetime-local"
                value={timeRange.start || ''}
                onChange={(e) => setTimeRange({...timeRange, start: e.target.value})}
                className={`w-full p-2.5 rounded-lg border transition-colors focus:ring-2 focus:outline-none ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-opacity-50 text-white' 
                    : 'bg-white border-gray-300 focus:ring-indigo-300 text-gray-900'
                }`}
              />
            </div>
            <div className="relative">
              <input 
                type="datetime-local"
                value={timeRange.end || ''}
                onChange={(e) => setTimeRange({...timeRange, end: e.target.value})}
                className={`w-full p-2.5 rounded-lg border transition-colors focus:ring-2 focus:outline-none ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-opacity-50 text-white' 
                    : 'bg-white border-gray-300 focus:ring-indigo-300 text-gray-900'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for level filter buttons
interface LevelFilterButtonProps {
  level: string;
  icon: React.ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
  darkMode: boolean;
  colors: {
    bg: string;
    text: string;
    border: string;
    icon: string;
    darkBg: string;
    darkText: string;
  };
}

const LevelFilterButton: React.FC<LevelFilterButtonProps> = ({ 
  level, 
  icon, 
  count, 
  active, 
  onClick, 
  darkMode,
  colors
}) => {
  const getButtonClass = () => {
    if (active) {
      return darkMode 
        ? `${colors.darkBg} ${colors.darkText} border border-opacity-50 border-${level}`
        : `${colors.bg} ${colors.text} border ${colors.border}`;
    }
    return darkMode 
      ? 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600' 
      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200';
  };

  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors ${getButtonClass()}`}
    >
      {icon}
      {level.charAt(0).toUpperCase() + level.slice(1)}
      <span className={`ml-1.5 inline-flex items-center justify-center rounded-full ${
        darkMode ? 'bg-gray-800 bg-opacity-50 text-gray-300' : 'bg-white bg-opacity-80 text-gray-700'
      } text-xs font-medium px-1.5 py-0.5 min-w-[20px]`}>
        {count}
      </span>
    </button>
  );
};

export default FilterPanel;