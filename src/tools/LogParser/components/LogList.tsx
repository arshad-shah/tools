import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight,
  Copy, 
  Clock, 
  Tag,
  AlertCircle,
  Info,
  Cpu,
  CheckCircle,
  AlertTriangle,
  Check
} from 'lucide-react';
import { LogEntry, LogLevel } from '../../../types/LogParserTypes';
import { getLogLevelConfig } from '../utils/utils';
import { useCopyToClipboard, useAnimations } from '../hooks/useLogParser';

interface LogListProps {
  logs: LogEntry[];
  darkMode: boolean;
}

const LogList: React.FC<LogListProps> = ({ logs, darkMode }) => {
  const [expandedLogs, setExpandedLogs] = useState<{[id: string]: boolean}>({});
  const { copyToClipboard, copied } = useCopyToClipboard();
  const {  staggerChildren } = useAnimations();

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
  };

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="h-full overflow-y-auto overscroll-contain"
    >
      <AnimatePresence>
        {logs.map((log, index) => (
          <LogEntryCard
            key={`${log.id}-${index}`}
            log={log}
            darkMode={darkMode}
            isExpanded={expandedLogs[log.id.toString()] || false}
            onToggleExpand={() => toggleExpand(log.id.toString())}
            onCopy={handleCopy}
            copied={copied}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

interface LogEntryCardProps {
  log: LogEntry;
  darkMode: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}

const LogEntryCard: React.FC<LogEntryCardProps> = ({
  log,
  darkMode,
  isExpanded,
  onToggleExpand,
  onCopy,
  copied
}) => {
  const { fadeInUp, scaleIn } = useAnimations();
  const config = getLogLevelConfig(log.level);

  const getLevelIcon = (level: LogLevel) => {
    const iconProps = { size: 16 };
    switch (level) {
      case 'error':
        return <AlertCircle {...iconProps} className={darkMode ? config.darkColor : config.color} />;
      case 'warn':
        return <AlertTriangle {...iconProps} className={darkMode ? config.darkColor : config.color} />;
      case 'debug':
        return <Cpu {...iconProps} className={darkMode ? config.darkColor : config.color} />;
      case 'success':
        return <CheckCircle {...iconProps} className={darkMode ? config.darkColor : config.color} />;
      default:
        return <Info {...iconProps} className={darkMode ? config.darkColor : config.color} />;
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      exit="hidden"
      layout
      className={`group border-l-4 transition-all duration-200 hover:shadow-lg ${
        darkMode 
          ? `${config.darkBorderColor} hover:bg-gray-800/50` 
          : `${config.borderColor} hover:bg-gray-50`
      }`}
    >
      <motion.div
        whileHover={{ x: 2 }}
        className="relative overflow-hidden"
      >
        {/* Main Log Entry */}
        <div 
          className="p-4 cursor-pointer select-none"
          onClick={onToggleExpand}
        >
          <div className="flex items-start gap-4">
            {/* Expand/Collapse Button & Level Icon */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className={darkMode ? 'text-gray-400' : 'text-gray-500'}
              >
                <ChevronRight size={18} />
              </motion.div>
              
              <motion.div
                variants={scaleIn}
                className={`p-2 rounded-lg ${
                  darkMode ? config.darkBgColor : config.bgColor
                }`}
              >
                {getLevelIcon(log.level)}
              </motion.div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header with metadata */}
              <div className="flex flex-wrap items-center gap-3 mb-2">
                {/* Timestamp */}
                {log.timestamp && (
                  <motion.div
                    variants={scaleIn}
                    className={`flex items-center gap-1 text-xs font-medium ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    <Clock size={12} />
                    <span className="font-mono">{log.timestamp}</span>
                  </motion.div>
                )}
                
                {/* Component */}
                {log.component && (
                  <motion.span
                    variants={scaleIn}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Tag size={10} />
                    {log.component}
                  </motion.span>
                )}
                
                {/* Execution/Build Time */}
                {(log.executionTime || log.buildTime) && (
                  <motion.span
                    variants={scaleIn}
                    className={`text-xs font-medium ${
                      darkMode ? 'text-indigo-400' : 'text-indigo-600'
                    }`}
                  >
                    {log.executionTime || log.buildTime}
                  </motion.span>
                )}
                
                {/* Level Badge */}
                <motion.span
                  variants={scaleIn}
                  className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                    darkMode 
                      ? `${config.darkBgColor} ${config.darkTextColor}` 
                      : `${config.bgColor} ${config.textColor}`
                  }`}
                >
                  {log.level}
                </motion.span>
              </div>
              
              {/* Message */}
              <div className={`font-mono text-sm leading-relaxed ${
                darkMode ? 'text-gray-200' : 'text-gray-800'
              } ${!isExpanded ? 'line-clamp-2' : ''}`}>
                {log.message}
              </div>
            </div>
            
            {/* Copy Button */}
            <motion.button
              variants={scaleIn}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onCopy(log.raw);
              }}
              className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                  : 'hover:bg-gray-200 text-gray-500 hover:text-gray-600'
              }`}
              title="Copy log entry"
            >
              <motion.div
                animate={{ scale: copied ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </motion.div>
            </motion.button>
          </div>
        </div>
        
        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className={`px-4 pb-4 ml-12 space-y-4 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {/* Details Section */}
                {log.details && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h4 className="text-sm font-semibold mb-2">Details</h4>
                    <div className={`p-3 rounded-lg font-mono text-sm overflow-x-auto ${
                      darkMode 
                        ? 'bg-gray-800/50 text-gray-300' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      <pre className="whitespace-pre-wrap">{log.details}</pre>
                    </div>
                  </motion.div>
                )}
                
                {/* Raw Log Section */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold">Raw Log</h4>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onCopy(log.raw)}
                      className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                        darkMode 
                          ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' 
                          : 'text-indigo-600 hover:text-indigo-500 hover:bg-indigo-50'
                      }`}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      Copy
                    </motion.button>
                  </div>
                  <div className={`p-3 rounded-lg font-mono text-xs overflow-x-auto border ${
                    darkMode 
                      ? 'bg-gray-800/30 text-gray-300 border-gray-700' 
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    <pre className="whitespace-pre-wrap">{log.raw}</pre>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default LogList;