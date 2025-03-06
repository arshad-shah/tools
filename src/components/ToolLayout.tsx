import React, { useEffect, useState, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Star, Shield, Clock } from 'lucide-react';
import { ToolComponent, ToolDefinition } from '../types/ToolTypes';
import { motion, AnimatePresence } from 'framer-motion';
import ToolErrorBoundary from './ToolErrorBoundary';

interface ToolLayoutProps {
  definition: ToolDefinition;
  ToolComponent: React.LazyExoticComponent<ToolComponent> | ToolComponent;
}

// Badge variants based on tool status
interface BadgeProps {
  type: 'new' | 'beta' | 'stable' | 'pro';
  label?: string;
}

// Loading component that matches the design aesthetic
const ToolLoadingFallback: React.FC<{ definition: ToolDefinition }> = ({ definition }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full">
      <div 
        className={`${definition.color} p-3 rounded-lg text-white shadow-lg mb-4 opacity-80`}
      >
        <definition.icon size={28} />
      </div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-slate-300 text-lg font-medium"
      >
        Loading {definition.name}...
      </motion.div>
      
      <motion.div 
        className="w-64 h-1 mt-6 bg-slate-700 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 background-size-200"
          animate={{ 
            x: ["-100%", "100%"],
            transition: { 
              repeat: Infinity, 
              duration: 1.5, 
              ease: "easeInOut" 
            }
          }}
        />
      </motion.div>
    </div>
  );
};

const Badge: React.FC<BadgeProps> = ({ type, label }) => {
  const getVariant = () => {
    switch (type) {
      case 'new':
        return 'bg-emerald-500 text-emerald-50';
      case 'beta':
        return 'bg-amber-500 text-amber-50';
      case 'stable':
        return 'bg-blue-500 text-blue-50';
      case 'pro':
        return 'bg-purple-500 text-purple-50';
      default:
        return 'bg-slate-500 text-slate-50';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'new':
        return <Star size={12} className="mr-1" />;
      case 'beta':
        return <Clock size={12} className="mr-1" />;
      case 'stable':
        return <Shield size={12} className="mr-1" />;
      case 'pro':
        return <ExternalLink size={12} className="mr-1" />;
      default:
        return null;
    }
  };

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${getVariant()}`}>
      {getIcon()}
      {label || type}
    </span>
  );
};

/**
 * Enhanced shared layout wrapper for all tools
 * Provides consistent header and navigation with modern design elements,
 * animations, and visual improvements with lazy loading support
 */
const ToolLayout: React.FC<ToolLayoutProps> = ({ definition, ToolComponent }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showBgElements, setShowBgElements] = useState(false);
  const [key, setKey] = useState<number>(Date.now()); // Used for forcing re-render on error retry
  const navigate = useNavigate();

  useEffect(() => {
    // Stagger animations
    const timer1 = setTimeout(() => setIsLoaded(true), 100);
    const timer2 = setTimeout(() => setShowBgElements(true), 300);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Determine badge type based on tool version
  const getBadgeType = (): BadgeProps['type'] => {
    if (!definition.version) return 'stable';
    if (definition.version.includes('beta')) return 'beta';
    if (definition.version.startsWith('0.')) return 'beta';
    if (parseFloat(definition.version) < 1) return 'beta';
    return 'stable';
  };

  // Get color based on definition.color but with proper opacity
  const getToolIconBg = () => {
    // Extract the base color name from the Tailwind class
    const baseColorMatch = definition.color.match(/bg-([a-z]+)-\d+/);
    if (baseColorMatch && baseColorMatch[1]) {
      const baseColor = baseColorMatch[1];
      return `bg-${baseColor}-500 hover:bg-${baseColor}-400`;
    }
    return 'bg-blue-500 hover:bg-blue-400';
  };
  
  const handleRetry = () => {
    // Reset the component key to force a re-mount
    setKey(Date.now());
  };
  
  const handleNavigateHome = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-black overflow-hidden">
      {/* Animated background elements */}
      <AnimatePresence>
        {showBgElements && (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} 
              animate={{ opacity: 0.2, scale: 1 }}
              transition={{ duration: 1.5 }}
              className="fixed inset-0 z-0"
            >
              <motion.div 
                animate={{ 
                  x: [0, 20, 0], 
                  y: [0, 15, 0],
                  opacity: [0.4, 0.5, 0.4]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 20, 
                  ease: "easeInOut" 
                }}
                className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-purple-600 blur-3xl"
              />
              <motion.div 
                animate={{ 
                  x: [0, -15, 0], 
                  y: [0, 10, 0],
                  opacity: [0.3, 0.4, 0.3]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 15, 
                  ease: "easeInOut" 
                }}
                className="absolute top-1/4 -left-40 w-80 h-80 rounded-full bg-blue-600 blur-3xl"
              />
              <motion.div 
                animate={{ 
                  x: [0, 25, 0], 
                  y: [0, -15, 0],
                  opacity: [0.2, 0.3, 0.2]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 25, 
                  ease: "easeInOut" 
                }}
                className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-cyan-600 blur-3xl"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Tool Header with glass effect */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-10 backdrop-blur-md bg-slate-900 bg-opacity-80 border-b border-slate-700/50 shadow-lg"
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <motion.div 
                initial={{ x: -5, opacity: 0.8 }} 
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                whileHover={{ 
                  scale: 1.1,
                  x: -3,
                  backgroundColor: 'rgba(30, 41, 59, 0.8)' 
                }} 
                whileTap={{ scale: 0.92 }}
              >
                <Link 
                  to="/" 
                  className="flex items-center gap-1 px-3 py-2 rounded-full bg-slate-800/50 shadow-md border border-slate-700/40 transition-all duration-200 text-slate-300 hover:text-white hover:border-slate-600/70 group"
                  aria-label="Back to tools"
                >
                  <ArrowLeft 
                    size={18} 
                    className="group-hover:translate-x-[-2px] transition-transform duration-200" 
                  />
                  <span className="text-xs font-medium opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto group-hover:ml-1 transition-all duration-200 overflow-hidden whitespace-nowrap">
                    Back
                  </span>
                </Link>
              </motion.div>
              
              <div className="flex items-center space-x-3">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`${getToolIconBg()} p-3 rounded-lg text-white shadow-lg ring-2 ring-white/10 transition-all duration-200`}
                >
                  <definition.icon size={22} />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-white tracking-tight">{definition.name}</h1>
                    {definition.category && (
                      <span className="text-xs font-medium bg-slate-700/60 px-2 py-0.5 rounded-full text-slate-300">
                        {definition.category}
                      </span>
                    )}
                  </div>
                  <div className="flex mt-1 gap-2">
                    {definition.version && (
                      <Badge 
                        type={getBadgeType()} 
                        label={definition.version.includes('beta') ? 'Beta' : `v${definition.version}`} 
                      />
                    )}
                    {!definition.enabled && (
                      <Badge type="pro" label="Coming soon" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="hidden md:block text-sm text-slate-400"
            >
              {definition.description}
            </motion.div>
          </div>
        </div>
      </motion.header>
      
      {/* Tool Content */}
      <motion.main 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-1 max-w-6xl mx-auto p-4"
      >
        <AnimatePresence mode="wait">
          {isLoaded && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="bg-slate-900 bg-opacity-70 backdrop-blur-md rounded-xl shadow-xl border border-slate-700/50 p-4 overflow-hidden"
            >
              <ToolErrorBoundary 
                toolName={definition.name}
                toolId={definition.id}
                onRetry={handleRetry}
                onNavigateHome={handleNavigateHome}
              >
                <Suspense fallback={<ToolLoadingFallback definition={definition} />}>
                  {React.isValidElement(ToolComponent) ? (
                    ToolComponent
                  ) : (
                    <ToolComponent key={key} definition={definition} />
                  )}
                </Suspense>
              </ToolErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
};

export default ToolLayout;