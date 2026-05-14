import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, HelpCircle } from 'lucide-react';
import { Element } from '../../types/PeriodicTableTypes';
import { colorMap } from './Data';
import ElementModel3D from './ElementModal3D';
import ElementModel2D from './ElementModel2D';

interface ElementModalProps {
  element: Element;
  onClose: () => void;
  use3D: boolean;
  onToggle3D: () => void;
  darkMode: boolean;
}

const ElementModal: React.FC<ElementModalProps> = ({ 
  element, 
  onClose, 
  use3D,
  onToggle3D,
  darkMode
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Close modal when escape key is pressed
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Helper function to determine text contrast color
  const getTextColor = (hexColor: string): string => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // Calculate contrast
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'text-gray-900' : 'text-white';
  };

  // Format element properties for display
  const elementProperties = [
    { label: 'Atomic Number', value: element.number },
    { label: 'Group', value: element.group.charAt(0).toUpperCase() + element.group.slice(1) },
    { label: 'Period', value: element.period },
    { label: 'Atomic Mass', value: typeof element.mass === 'number' ? element.mass.toFixed(3) + ' u' : element.mass + ' u' },
    { label: 'Electron Configuration', value: element.electrons }
  ];

  // 3D Model color legend
  const colorLegend = [
    { color: '#f44336', label: 'Nucleus (protons and neutrons)' },
    { color: '#2196f3', label: 'First shell electrons' },
    { color: '#4caf50', label: 'Second shell electrons' },
    { color: '#ffeb3b', label: 'Third shell electrons' },
    { color: '#ff9800', label: 'Fourth shell electrons' }
  ];

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        delay: 0.1
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const staggerItems = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07
      }
    }
  };

  //TODO: align these types to the variants that framer motion expects
  // const itemVariants = {
  //   hidden: { opacity: 0, y: 10 },
  //   visible: { 
  //     opacity: 1, 
  //     y: 0,
  //     transition: { type: "spring", stiffness: 300, damping: 24 }
  //   }
  // };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div 
          className={`w-full max-w-4xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl flex flex-col ${
            darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'
          }`}
          //@ts-expect-error variants are sortof misaligned with the expected types.
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className={`relative px-6 py-4 ${getTextColor(colorMap[element.group])} flex justify-between items-center`}
            style={{ backgroundColor: colorMap[element.group] }}
          >
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 items-center">
              <div className="text-2xl font-bold opacity-80">
                {element.number}
              </div>
              <div className="flex flex-col">
                <div className="text-4xl font-bold tracking-tight">
                  {element.symbol}
                </div>
                <div className="text-xl font-medium">
                  {element.name}
                </div>
              </div>
              <div className="text-lg font-medium text-right">
                {typeof element.mass === 'number' ? element.mass.toFixed(3) : element.mass} u
              </div>
            </div>
            
            <motion.button 
              className={`p-2 rounded-full ${getTextColor(colorMap[element.group]) === 'text-white' ? 'hover:bg-white/20' : 'hover:bg-black/10'} transition-colors`}
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} />
            </motion.button>

            {/* Decorative element */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-white/30 to-transparent"></div>
          </div>

          {/* Visualization Container */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-4`}>
            <div className="relative">
              {/* Model display */}
              <div className={`flex justify-center items-center w-full h-[400px] rounded-lg overflow-hidden ${
                darkMode ? 'bg-gray-700' : 'bg-white'
              } shadow-md`}>
                {use3D ? (
                  <ElementModel3D 
                    element={element}
                    containerSize={{ width: 800, height: 400 }}
                  />
                ) : (
                  <ElementModel2D 
                    element={element} 
                    containerSize={{ width: 800, height: 400 }} 
                  />
                )}
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between mt-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={use3D} 
                  onChange={onToggle3D}
                />
                <div className={`w-11 h-6 rounded-full peer 
                  ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} 
                  peer-checked:after:translate-x-full after:content-[''] 
                  after:absolute after:top-[2px] after:left-[2px] 
                  after:bg-white after:border-gray-300 after:border 
                  after:rounded-full after:h-5 after:w-5 after:transition-all 
                  peer-checked:bg-blue-600`}>
                </div>
                <span className="ml-3 text-sm font-medium">
                  {use3D ? '3D Model' : '2D Model'}
                </span>
              </label>
            </div>
          </div>

          {/* Information Section - Now Scrollable */}
          <div className={`p-6 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-white'} flex-1`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                variants={staggerItems}
                initial="hidden"
                animate="visible"
                className={`p-5 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-50'
                }`}
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Info size={18} className="mr-2 opacity-70" />
                  Element Information
                </h3>
                
                <div className="grid grid-cols-1 gap-2">
                  {elementProperties.map((prop) => (
                    <motion.div 
                      key={prop.label}
                      //TODO: variant types are incorrect
                      // variants={itemVariants}
                      className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 py-2"
                    >
                      <span className="font-medium">{prop.label}</span>
                      <span className={`px-2 py-1 rounded ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        {prop.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <div className={`p-5 rounded-lg ${
                darkMode ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
                <h3 className="text-lg font-semibold mb-4">Description</h3>
                <p className="leading-relaxed">{element.description}</p>
              </div>
            </div>
            
            {/* 3D Model Legend */}
            {use3D && (
              <motion.div 
                className={`mt-6 p-5 rounded-lg ${
                  darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <HelpCircle size={18} className="mr-2 opacity-70" />
                  3D Model Legend
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  {colorLegend.map((item, index) => (
                    <motion.div 
                      key={index}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        darkMode ? 'bg-gray-700' : 'bg-white'
                      } shadow-sm`}
                      whileHover={{ scale: 1.05, y: -2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm">{item.label}</span>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-4 text-xs opacity-70 italic">
                  Note: The model is a simplified representation of the atomic structure.
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ElementModal;