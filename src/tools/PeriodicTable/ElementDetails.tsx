import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Info, Cuboid, Square} from 'lucide-react';
import { Element } from '../../types/PeriodicTableTypes';
import { colorMap } from './Data';

interface ElementDetailsProps {
  element: Element;
  onViewDetailsClick: () => void;
  use3D: boolean;
  onToggle3D: () => void;
  darkMode: boolean;
}

const ElementDetails: React.FC<ElementDetailsProps> = ({ 
  element, 
  onViewDetailsClick,
  use3D,
  onToggle3D,
  darkMode
}) => {
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

  // Format properties
  const elementProperties = [
    { name: 'Atomic Number', value: element.number },
    { name: 'Mass', value: typeof element.mass === 'number' ? element.mass.toFixed(3) + ' u' : element.mass + ' u' },
    { name: 'Group', value: element.group.charAt(0).toUpperCase() + element.group.slice(1) },
    { name: 'Period', value: element.period },
    { name: 'Electron Configuration', value: element.electrons }
  ];

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="w-full overflow-hidden"
    >
      {/* Element Header */}
      <div 
        className={`relative px-6 py-6 ${getTextColor(colorMap[element.group])}`}
        style={{ backgroundColor: colorMap[element.group] }}
      >
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 items-center">
          <div className="text-2xl md:text-3xl font-bold opacity-90">
            {element.number}
          </div>
          <div className="flex flex-col">
            <div className="text-4xl md:text-5xl font-bold tracking-tight mb-1">
              {element.symbol}
            </div>
            <div className="text-lg md:text-xl font-medium">
              {element.name}
            </div>
          </div>
          <div className="text-lg md:text-xl font-medium text-right">
            {typeof element.mass === 'number' ? element.mass.toFixed(3) : element.mass} u
          </div>
        </div>
        
        {/* Decorative element */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-white/30 to-transparent"></div>
      </div>

      {/* Content */}
      <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          {/* Properties Section */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Info size={18} className="mr-2 opacity-70" />
              Properties
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {elementProperties.map((prop) => (
                <motion.div
                  key={prop.name}
                  variants={itemVariants}
                  className={`p-3 rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <div className="text-sm opacity-70">{prop.name}</div>
                  <div className="font-medium truncate">{prop.value}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Description Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              } border-l-4`}
              style={{ borderLeftColor: colorMap[element.group] }}
            >
              <p className="text-sm md:text-base leading-relaxed">
                {element.description}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Actions */}
        <motion.div 
          className="mt-6 flex flex-wrap gap-3 justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {/* Toggle 3D/2D */}
          <div className="flex items-center mr-auto">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={use3D} 
                onChange={onToggle3D}
              />
              <div className={`w-11 h-6 rounded-full peer 
                ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} 
                peer-checked:after:translate-x-full peer-checked:after:border-white 
                after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                after:bg-white after:border-gray-300 after:border after:rounded-full 
                after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}>
              </div>
              <span className="ml-3 text-sm font-medium flex items-center gap-1">
                {use3D ? <Cuboid size={16} /> : <Square size={16} />}
                {use3D ? '3D' : '2D'} Model
              </span>
            </label>
          </div>
          
          <motion.button 
            onClick={onViewDetailsClick}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-1 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Model
            <ExternalLink size={16} />
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ElementDetails;