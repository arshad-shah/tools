import React, { useState } from 'react';
import { FileText, Trash2, Download, Copy, RefreshCw, Clock, AlertCircle, Info, Cpu, Check, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { exportLogsAsJson } from '../utils/utils';
import { LogEntry } from '../../../types/LogParserTypes';

interface LogContentProps {
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
}

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
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'input' | 'output'>('split');
  const [searchTerm, setSearchTerm] = useState(filter);
  const [componentFilter, setComponentFilter] = useState(searchComponent);
  const [expandedLogs, setExpandedLogs] = useState<{[id: string]: boolean}>({});

  // Extract unique components for filtering
  const uniqueComponents = [...new Set(parsedLogs.map(log => log.component).filter(Boolean))];
  
  // Stats for summary
  const logStats = {
    error: parsedLogs.filter(log => log.level === 'error').length,
    warn: parsedLogs.filter(log => log.level === 'warn').length,
    info: parsedLogs.filter(log => log.level === 'info').length,
    debug: parsedLogs.filter(log => log.level === 'debug').length,
    success: parsedLogs.filter(log => log.level === 'success').length,
  };

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className={`flex flex-col h-full transition-colors duration-200 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Action Bar */}
      <div className={`flex items-center justify-between p-3 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center space-x-2">
          <div className="flex items-center ml-4 space-x-2">
            <button 
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-md text-sm ${viewMode === 'split' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
                : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')}`}
            >
              Split
            </button>
            <button 
              onClick={() => setViewMode('input')}
              className={`px-3 py-1 rounded-md text-sm ${viewMode === 'input' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
                : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')}`}
            >
              Input
            </button>
            <button 
              onClick={() => setViewMode('output')}
              className={`px-3 py-1 rounded-md text-sm ${viewMode === 'output' 
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
                : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')}`}
            >
              Output
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          
          <button 
            onClick={loadSampleLogs}
            className={`px-3 py-1 rounded-md flex items-center text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
          >
            <FileText size={14} className="mr-1" />
            Sample Logs
          </button>
        </div>
      </div>
      
      <div className={`flex-grow flex ${viewMode === 'split' ? 'flex-col md:flex-row' : 'flex-col'}`}>
        {/* Input Panel */}
        {(viewMode === 'split' || viewMode === 'input') && (
          <div className={`${viewMode === 'split' ? 'md:w-1/2' : 'w-full'} flex flex-col p-4`}>
            <div className="flex justify-between items-center mb-3">
              <label className="font-medium text-lg">Input Logs</label>
              <div className="flex space-x-2">
                <button 
                  onClick={clearLogs}
                  className={`px-3 py-1.5 rounded-md flex items-center text-sm ${!logText ? 'opacity-50 cursor-not-allowed' : ''} ${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                  disabled={!logText}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Clear
                </button>
              </div>
            </div>
            
            <div className={`relative flex-grow rounded-lg shadow-sm overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <textarea 
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Paste your logs here or load a sample..."
                className={`w-full h-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}
              />
            </div>
          </div>
        )}
        
        {/* Results Panel */}
        {(viewMode === 'split' || viewMode === 'output') && (
          <div className={`${viewMode === 'split' ? 'md:w-1/2' : 'w-full'} flex flex-col p-4`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <h2 className="font-medium text-lg">Results</h2>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  {filteredLogs.length} / {parsedLogs.length}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={resetFilters}
                  disabled={!filter && !searchComponent}
                  className={`px-3 py-1.5 rounded-md flex items-center text-sm ${!filter && !searchComponent ? 'opacity-50 cursor-not-allowed' : ''} ${darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'}`}
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  Reset Filters
                </button>
                
                <button 
                  onClick={() => exportLogsAsJson(filteredLogs)}
                  disabled={filteredLogs.length === 0}
                  className={`px-3 py-1.5 rounded-md flex items-center text-sm ${filteredLogs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''} ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                >
                  <Download size={14} className="mr-1.5" />
                  Export JSON
                </button>
              </div>
            </div>
            
            {/* Search and Filter Bar */}
            <div className={`mb-3 flex flex-col sm:flex-row gap-2 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search logs..."
                  className={`pl-10 pr-4 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-300'}`}
                />
              </div>
              
              <select
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value)}
                className={`py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-300'}`}
              >
                <option value="">All Components</option>
                {uniqueComponents.map(component => (
                  <option key={component} value={component}>{component}</option>
                ))}
              </select>
            </div>
            
            {/* Log Summary Cards */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              <div className={`p-2 rounded-md text-center ${darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'}`}>
                <div className="font-bold">{logStats.error}</div>
                <div className="text-xs">Errors</div>
              </div>
              <div className={`p-2 rounded-md text-center ${darkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'}`}>
                <div className="font-bold">{logStats.warn}</div>
                <div className="text-xs">Warnings</div>
              </div>
              <div className={`p-2 rounded-md text-center ${darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'}`}>
                <div className="font-bold">{logStats.info}</div>
                <div className="text-xs">Info</div>
              </div>
              <div className={`p-2 rounded-md text-center ${darkMode ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'}`}>
                <div className="font-bold">{logStats.debug}</div>
                <div className="text-xs">Debug</div>
              </div>
              <div className={`p-2 rounded-md text-center ${darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'}`}>
                <div className="font-bold">{logStats.success}</div>
                <div className="text-xs">Success</div>
              </div>
            </div>
            
            {/* Log List */}
            <div className={`flex-grow rounded-lg shadow-sm overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <div className={`h-full overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                {filteredLogs.length > 0 ? (
                  <EnhancedLogList 
                    logs={filteredLogs} 
                    darkMode={darkMode} 
                    expandedLogs={expandedLogs}
                    toggleExpand={toggleExpand}
                  />
                ) : (
                  <EmptyState 
                    logText={logText} 
                    resetFilters={resetFilters} 
                    loadSampleLogs={loadSampleLogs} 
                    darkMode={darkMode} 
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Log List Component with expandable entries
interface EnhancedLogListProps {
  logs: LogEntry[];
  darkMode: boolean;
  expandedLogs: {[id: string]: boolean};
  toggleExpand: (id: string) => void;
}

const EnhancedLogList: React.FC<EnhancedLogListProps> = ({ 
  logs, 
  darkMode, 
  expandedLogs,
  toggleExpand
}) => {
  // Get icon based on log level
  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'warn':
        return <Info className="text-yellow-500" size={16} />;
      case 'debug':
        return <Cpu className="text-purple-500" size={16} />;
      case 'success':
        return <Check className="text-green-500" size={16} />;
      default:
        return <Info className="text-blue-500" size={16} />;
    }
  };

  // Get color class based on log level
  const getLevelBgClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return darkMode ? 'bg-red-900' : 'bg-red-100';
      case 'warn':
        return darkMode ? 'bg-yellow-900' : 'bg-yellow-100';
      case 'debug':
        return darkMode ? 'bg-purple-900' : 'bg-purple-100';
      case 'success':
        return darkMode ? 'bg-green-900' : 'bg-green-100';
      default:
        return darkMode ? 'bg-blue-900' : 'bg-blue-100';
    }
  };

  // Get border color based on log level
  const getLevelBorderClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return darkMode ? 'border-red-800' : 'border-red-200';
      case 'warn':
        return darkMode ? 'border-yellow-800' : 'border-yellow-200';
      case 'debug':
        return darkMode ? 'border-purple-800' : 'border-purple-200';
      case 'success':
        return darkMode ? 'border-green-800' : 'border-green-200';
      default:
        return darkMode ? 'border-blue-800' : 'border-blue-200';
    }
  };

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {logs.map((log) => {
        const isExpanded = expandedLogs[log.id] || false;
        return (
          <div 
            key={log.id} 
            className={`group border-l-4 ${getLevelBorderClass(log.level)} hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors duration-150`}
          >
            <div 
              className="p-3 cursor-pointer"
              onClick={() => toggleExpand(log.id.toString())}
            >
              <div className="flex items-start">
                <div className="mr-3 flex items-center">
                  {isExpanded ? (
                    <ChevronDown size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                  ) : (
                    <ChevronRight size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                  )}
                  <div className={`ml-2 p-2 rounded-full ${getLevelBgClass(log.level)}`}>
                    {getLevelIcon(log.level)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Header section with metadata */}
                  <div className="flex flex-wrap items-center mb-1 gap-2">
                    {/* Timestamp */}
                    {log.timestamp && (
                      <span className={`flex items-center text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock size={12} className="mr-1" />
                        {log.timestamp}
                      </span>
                    )}
                    
                    {/* Component badge */}
                    {log.component && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>
                        {log.component}
                      </span>
                    )}
                    
                    {/* Build/Execution time */}
                    {(log.executionTime || log.buildTime) && (
                      <span className={`flex items-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Clock size={12} className="mr-1" />
                        {log.executionTime || log.buildTime}
                      </span>
                    )}
                  </div>
                  
                  {/* Main message content - truncate if not expanded */}
                  <div className={`font-mono text-sm break-words ${darkMode ? 'text-gray-200' : 'text-gray-800'} ${!isExpanded && 'line-clamp-2'}`}>
                    {log.message}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(log.raw);
                    }}
                    className={`p-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    title="Copy log"
                  >
                    <Copy size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Expanded content */}
            {isExpanded && (
              <div className={`px-4 pb-3 pt-0 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {/* Details section if present */}
                {log.details && (
                  <div className={`mt-1 p-3 rounded font-mono text-sm overflow-x-auto ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    <pre className="whitespace-pre-wrap">{log.details}</pre>
                  </div>
                )}
                
                {/* Raw log section */}
                <div className="mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">Raw Log</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(log.raw)}
                      className={`text-xs flex items-center ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                    >
                      <Copy size={12} className="mr-1" />
                      Copy
                    </button>
                  </div>
                  <div className={`mt-1 p-3 rounded font-mono text-xs overflow-x-auto ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    <pre className="whitespace-pre-wrap">{log.raw}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Empty State Component with improved visuals
interface EmptyStateProps {
  logText: string;
  resetFilters: () => void;
  loadSampleLogs: () => void;
  darkMode: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ logText, resetFilters, loadSampleLogs, darkMode }) => {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center h-full ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      {logText ? (
        <>
          <div className={`p-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} mb-4`}>
            <FileText size={40} className="opacity-60" />
          </div>
          <p className="text-xl font-medium mb-2">No matching logs found</p>
          <p className="mb-6 max-w-md">Your search or filter criteria didn't match any logs. Try adjusting your search terms or clearing filters.</p>
          <button 
            onClick={resetFilters}
            className={`px-6 py-2 rounded-md flex items-center shadow-sm ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            <RefreshCw size={16} className="mr-2" />
            Reset All Filters
          </button>
        </>
      ) : (
        <>
          <div className={`p-4 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} mb-4`}>
            <FileText size={40} className="opacity-60" />
          </div>
          <p className="text-xl font-medium mb-2">No logs to display</p>
          <p className="mb-6 max-w-md">Paste your logs in the input panel or load a sample to get started.</p>
          <button 
            onClick={loadSampleLogs}
            className={`px-6 py-2 rounded-md flex items-center shadow-sm ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            <FileText size={16} className="mr-2" />
            Load Sample Logs
          </button>
        </>
      )}
    </div>
  );
};

export default LogContent;