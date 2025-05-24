import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  RefreshCw, 
  Sparkles, 
  Search,
  Filter
} from 'lucide-react';
import { EmptyStateProps } from '../../../types/LogParserTypes';
import { useAnimations } from '../hooks/useLogParser';

const EmptyState: React.FC<EmptyStateProps> = ({ 
  logText, 
  resetFilters, 
  loadSampleLogs, 
  darkMode,
  hasFilters 
}) => {
  const { fadeInUp, scaleIn, staggerChildren } = useAnimations();

  if (logText && hasFilters) {
    // Show "No matching logs" state when logs exist but filters don't match
    return (
      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <motion.div
          variants={scaleIn}
          className={`p-6 rounded-full mb-6 ${
            darkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}
        >
          <Search 
            size={48} 
            className={`${darkMode ? 'text-gray-600' : 'text-gray-400'} opacity-60`} 
          />
        </motion.div>
        
        <motion.h3
          variants={fadeInUp}
          className={`text-2xl font-bold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          No matching logs found
        </motion.h3>
        
        <motion.p
          variants={fadeInUp}
          className={`text-lg mb-8 max-w-md leading-relaxed ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          Your search or filter criteria didn't match any logs. Try adjusting your search terms or clearing filters.
        </motion.p>
        
        <motion.button
          variants={scaleIn}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetFilters}
          className={`px-6 py-3 rounded-xl flex items-center gap-3 font-semibold transition-all duration-200 shadow-lg ${
            darkMode 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25' 
              : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/25'
          }`}
        >
          <RefreshCw size={18} />
          Reset All Filters
        </motion.button>
      </motion.div>
    );
  }

  // Show "No logs" state when no logs are present
  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full p-8 text-center"
    >
      {/* Animated Icon */}
      <motion.div
        variants={scaleIn}
        className={`relative p-8 rounded-3xl mb-8 ${
          darkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}
      >
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <FileText 
            size={64} 
            className={`${darkMode ? 'text-gray-600' : 'text-gray-400'} opacity-60`} 
          />
        </motion.div>
        
        {/* Floating particles */}
        <motion.div
          animate={{ 
            y: [-10, -20, -10],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-2 -right-2"
        >
          <div className={`w-3 h-3 rounded-full ${
            darkMode ? 'bg-indigo-400' : 'bg-indigo-500'
          } opacity-60`} />
        </motion.div>
        
        <motion.div
          animate={{ 
            y: [-15, -25, -15],
            opacity: [0.3, 0.8, 0.3]
          }}
          transition={{ 
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="absolute -bottom-1 -left-1"
        >
          <div className={`w-2 h-2 rounded-full ${
            darkMode ? 'bg-purple-400' : 'bg-purple-500'
          } opacity-60`} />
        </motion.div>
      </motion.div>
      
      <motion.h3
        variants={fadeInUp}
        className={`text-3xl font-bold mb-3 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        Ready to analyze logs
      </motion.h3>
      
      <motion.p
        variants={fadeInUp}
        className={`text-xl mb-8 max-w-lg leading-relaxed ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        Paste your logs in the input panel or load a sample to start parsing and analyzing your log data.
      </motion.p>
      
      <motion.div
        variants={staggerChildren}
        className="flex flex-col sm:flex-row gap-4"
      >
        <motion.button
          variants={scaleIn}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadSampleLogs}
          className={`px-8 py-4 rounded-xl flex items-center gap-3 font-semibold transition-all duration-200 shadow-lg ${
            darkMode 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25' 
              : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/25'
          }`}
        >
          <Sparkles size={20} />
          Load Sample Logs
        </motion.button>
        
        <motion.div
          variants={scaleIn}
          className={`px-8 py-4 rounded-xl flex items-center gap-3 font-medium border-2 border-dashed ${
            darkMode 
              ? 'border-gray-700 text-gray-400' 
              : 'border-gray-300 text-gray-600'
          }`}
        >
          <FileText size={20} />
          Or paste logs above
        </motion.div>
      </motion.div>
      
      {/* Feature highlights */}
      <motion.div
        variants={staggerChildren}
        className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl"
      >
        {[
          { icon: <FileText size={20} />, title: 'Multi-format Support', desc: 'Spring, Django, Node.js & more' },
          { icon: <Filter size={20} />, title: 'Advanced Filtering', desc: 'Search by level, component, time' },
          { icon: <Sparkles size={20} />, title: 'Smart Analysis', desc: 'Auto-detect format & extract data' }
        ].map((feature, index) => (
          <motion.div
            key={index}
            variants={fadeInUp}
            className={`p-4 rounded-xl text-center ${
              darkMode ? 'bg-gray-800/50' : 'bg-gray-50'
            }`}
          >
            <div className={`inline-flex p-2 rounded-lg mb-2 ${
              darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {feature.icon}
            </div>
            <h4 className={`font-semibold mb-1 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {feature.title}
            </h4>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {feature.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default EmptyState;