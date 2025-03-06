// Header.tsx
import React from 'react';
import { FileText, Filter, Moon, Sun, Zap, Server, Cpu, Database } from 'lucide-react';
import { detectLogType } from '../utils/utils';
import { LogType } from '../../../types/LogParserTypes';

interface HeaderProps {
  logType: LogType;
  logText: string;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  logType,
  logText,
  showFilters,
  setShowFilters,
  darkMode,
  setDarkMode
}) => {
  // Get icon based on log type
  const getTypeIcon = (type: LogType) => {
    switch (type) {
      case 'spring':
        return <Zap size={18} />;
      case 'django':
        return <Server size={18} />;
      case 'node':
        return <Cpu size={18} />;
      case 'sql':
        return <Database size={18} />;
      default:
        return <FileText size={18} />;
    }
  };

  const detectedType = logText ? detectLogType(logText) : null;

  return (
    <div className={`flex justify-between items-center p-4 mb-2 rounded-lg shadow-md ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'}`}>
      <div className="flex items-center gap-3">
        {/* Type badge - only show if a type is available */}
        {logType !== 'auto' && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${darkMode ? 'bg-blue-600/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            {getTypeIcon(logType)}
            <span className="ml-2 capitalize">{logType}</span>
          </div>
        )}
        
        {logType === 'auto' && detectedType && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${darkMode ? 'bg-green-600/20 text-green-300' : 'bg-green-100 text-green-700'}`}>
            {getTypeIcon(detectedType)}
            <span className="ml-2">Auto: <span className="capitalize">{detectedType}</span></span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Filter button */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-1 rounded-md flex items-center transition-colors ${
            showFilters 
              ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
              : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
          }`}
          aria-pressed={showFilters}
        >
          <Filter size={16} className="mr-2" />
          Filters
        </button>
        
        {/* Theme toggle button */}
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className={`px-3 py-1 rounded-md flex items-center transition-colors ${
            darkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
          aria-pressed={darkMode}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            <>
              <Sun size={16} className="mr-2" />
              Light
            </>
          ) : (
            <>
              <Moon size={16} className="mr-2" />
              Dark
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Header;