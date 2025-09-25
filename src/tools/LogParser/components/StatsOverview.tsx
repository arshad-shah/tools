import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle,
  AlertTriangle,
  Info,
  Cpu,
  CheckCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { LogEntry, LogLevel } from '../../../types/LogParserTypes';
import { countLogsByLevel, getLogLevelConfig } from '../utils/utils';
import { useAnimations } from '../hooks/useLogParser';

interface StatsOverviewProps {
  logs: LogEntry[];
  darkMode: boolean;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ logs, darkMode }) => {
  const { staggerChildren, scaleIn } = useAnimations();
  const logCounts = countLogsByLevel(logs);
  const totalLogs = logs.length;

  const statsData: { 
    level: LogLevel; 
    icon: React.ReactNode; 
    label: string; 
    count: number;
  }[] = [
    { level: 'error', icon: <AlertCircle size={16} />, label: 'Errors', count: logCounts.error },
    { level: 'warn', icon: <AlertTriangle size={16} />, label: 'Warnings', count: logCounts.warn },
    { level: 'info', icon: <Info size={16} />, label: 'Info', count: logCounts.info },
    { level: 'debug', icon: <Cpu size={16} />, label: 'Debug', count: logCounts.debug },
    { level: 'success', icon: <CheckCircle size={16} />, label: 'Success', count: logCounts.success }
  ];

  const getPercentage = (count: number) => {
    return totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0;
  };

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className={`p-4 rounded-xl border backdrop-blur-sm ${
        darkMode 
          ? 'bg-gray-800/30 border-gray-700' 
          : 'bg-white/50 border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${
          darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'
        }`}>
          <TrendingUp size={16} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
        </div>
        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Log Statistics
        </h4>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>
          {totalLogs} total
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statsData.map(({ level, icon, label, count }) => {
          const config = getLogLevelConfig(level);
          const percentage = getPercentage(count);
          
          return (
            <motion.div
              key={level}
              //@ts-expect-error variants are sortof misaligned with the expected types.
              variants={scaleIn}
              whileHover={{ scale: 1.02 }}
              className={`relative p-3 rounded-lg border transition-all duration-200 overflow-hidden ${
                darkMode 
                  ? `${config.darkBgColor} ${config.darkBorderColor} hover:shadow-lg` 
                  : `${config.bgColor} ${config.borderColor} hover:shadow-lg`
              }`}
            >
              {/* Background Progress Bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className={`absolute inset-y-0 left-0 opacity-20 ${
                  darkMode ? config.darkBgColor : config.bgColor
                }`}
              />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <span className={darkMode ? config.darkColor : config.color}>
                    {icon}
                  </span>
                  <span className={`text-xs font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {percentage}%
                  </span>
                </div>
                
                <div className={`text-2xl font-bold mb-1 ${
                  darkMode ? config.darkTextColor : config.textColor
                }`}>
                  {count.toLocaleString()}
                </div>
                
                <div className={`text-xs font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {label}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Health Indicator */}
      <motion.div
      //@ts-expect-error variants are sortof misaligned with the expected types.
        variants={scaleIn}
        className={`mt-4 p-3 rounded-lg flex items-center justify-between ${
          darkMode ? 'bg-gray-800/50' : 'bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Activity size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            System Health
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {logCounts.error > 0 ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className={`text-sm font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                Issues Detected
              </span>
            </div>
          ) : logCounts.warn > 0 ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className={`text-sm font-medium ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                Warnings Present
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className={`text-sm font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Healthy
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StatsOverview;