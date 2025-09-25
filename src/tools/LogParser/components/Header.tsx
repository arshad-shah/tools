import React, { JSX } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Filter, 
  Moon, 
  Sun, 
  Zap, 
  Server, 
  Cpu, 
  Database,
  Code2,
  Layers,
  Activity,
  TrendingUp
} from 'lucide-react';
import { HeaderProps, LogType } from '../../../types/LogParserTypes'; // Ensure this file exists and is correctly exported
import { detectLogType } from '../utils/utils'; // Ensure this file exists and is correctly exported
import { useAnimations } from '../hooks/useLogParser';

const Header: React.FC<HeaderProps> = ({
  logType,
  logText,
  showFilters,
  setShowFilters,
  darkMode,
  setDarkMode,
  totalLogs,
  filteredCount
}) => {
  const { fadeInUp, scaleIn } = useAnimations();

  // Get icon and color based on log type
  const getTypeConfig = (type: LogType) => {
    const configs: Record<LogType, { icon: JSX.Element; color: string; darkColor: string }> = {
      spring: { 
        icon: <Zap size={18} />, 
        color: 'bg-green-500/10 text-green-600 border-green-500/20',
        darkColor: 'bg-green-500/20 text-green-400 border-green-500/30'
      },
      django: { 
        icon: <Server size={18} />, 
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        darkColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      },
      node: { 
        icon: <Cpu size={18} />, 
        color: 'bg-lime-500/10 text-lime-600 border-lime-500/20',
        darkColor: 'bg-lime-500/20 text-lime-400 border-lime-500/30'
      },
      sql: { 
        icon: <Database size={18} />, 
        color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        darkColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      },
      webpack: { 
        icon: <Code2 size={18} />, 
        color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
        darkColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      },
      log4j: { 
        icon: <Layers size={18} />, 
        color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        darkColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      },
      generic: { 
        icon: <FileText size={18} />, 
        color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
        darkColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      },
      auto: { 
        icon: <Activity size={18} />, 
        color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        darkColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
      }
    
    };
    return configs[type];
  };

  const detectedType = logText ? detectLogType(logText) : null;
  const currentTypeConfig = getTypeConfig(logType);
  const detectedTypeConfig = detectedType ? getTypeConfig(detectedType) : null;

  return (
    <motion.header
    //@ts-expect-error variants are sortof misaligned with the expected types.
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-900/80 border-gray-800 shadow-lg shadow-gray-900/20' 
          : 'bg-white/80 border-gray-200 shadow-lg shadow-gray-900/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo & Type Badges */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <motion.div 
            //@ts-expect-error variants are sortof misaligned with the expected types.
              variants={scaleIn}
              className="flex items-center gap-3"
            >
              <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                <FileText className={`w-6 h-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Log Parser
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Advanced log analysis tool
                </p>
              </div>
            </motion.div>

            {/* Type Badges */}
            <div className="flex items-center gap-3">
              {/* Current Log Type */}
              {logType !== 'auto' && (
                <motion.div
                //@ts-expect-error variants are sortof misaligned with the expected types.
                  variants={scaleIn}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border ${
                    darkMode ? currentTypeConfig.darkColor : currentTypeConfig.color
                  }`}
                >
                  {currentTypeConfig.icon}
                  <span className="capitalize">{logType}</span>
                </motion.div>
              )}
              
              {/* Auto-detected Type */}
              {logType === 'auto' && detectedType && detectedTypeConfig && (
                <motion.div
                //@ts-expect-error variants are sortof misaligned with the expected types.
                  variants={scaleIn}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border ${
                    darkMode ? detectedTypeConfig.darkColor : detectedTypeConfig.color
                  }`}
                >
                  {detectedTypeConfig.icon}
                  <span>Auto: <span className="capitalize">{detectedType}</span></span>
                </motion.div>
              )}

              {/* Stats Badge */}
              {totalLogs > 0 && (
                <motion.div
                //@ts-expect-error variants are sortof misaligned with the expected types.
                  variants={scaleIn}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border ${
                    darkMode 
                      ? 'bg-gray-800/50 text-gray-300 border-gray-700' 
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <TrendingUp size={14} />
                  <span>
                    {filteredCount} / {totalLogs} logs
                  </span>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Right Section - Controls */}
          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                showFilters
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700'
                  : darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
              aria-pressed={showFilters}
            >
              <Filter size={16} />
              Filters
              {showFilters && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-white rounded-full"
                />
              )}
            </motion.button>
            
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-all duration-200 ${
                darkMode 
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-gray-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <motion.div
                initial={false}
                animate={{ rotate: darkMode ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;