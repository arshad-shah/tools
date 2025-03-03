import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Square, Menu, X, Cuboid} from 'lucide-react';
import { colorMap } from './Data';
import { Element } from '../../types/PeriodicTableTypes';
import ElementGrid from './ElementGrid';
import ElementDetails from './ElementDetails';
import ElementModal from './ElementModal';

const PeriodicTable: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [use3D, setUse3D] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  // Handle element selection
  const handleElementClick = (element: Element | null) => {
    setSelectedElement(element);
  };

  // Toggle 3D/2D visualization
  const toggle3DMode = () => {
    setUse3D(!use3D);
  };

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Open modal with visualization
  const openModal = () => {
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
  };
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <div className={`max-w-7xl mx-auto p-5 md:p-8 flex flex-col gap-6 rounded-2xl transition-all duration-300 ${
      darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'
    }`}>
      {/* Header */}
      <header className="relative">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <motion.h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Interactive Periodic Table
            </motion.h1>
            <motion.p 
              className="mt-2 text-sm md:text-base opacity-80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Explore elements and their properties with interactive {use3D ? '3D' : '2D'} models
            </motion.p>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            
            <motion.button
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={toggleDarkMode}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-gray-600" />}
            </motion.button>
            
            <motion.button
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                use3D 
                  ? 'bg-blue-500 text-white' 
                  : `${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`
              }`}
              onClick={toggle3DMode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {use3D ? <Cuboid size={16} /> : <Square size={16} />}
              <span className="text-sm font-medium">{use3D ? '3D' : '2D'} Mode</span>
            </motion.button>
          </div>
          
          <button 
            className="md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={toggleMobileMenu}
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Mobile menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div 
              className="md:hidden absolute right-0 mt-2 py-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={toggleDarkMode}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />} 
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                onClick={toggle3DMode}
              >
                {use3D ? <Cuboid size={18} /> : <Square size={18} />} 
                {use3D ? '3D' : '2D'} Mode
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      {/* Element Grid */}
      <ElementGrid 
        selectedElement={selectedElement} 
        onElementClick={handleElementClick}
      />
      
      {/* Element Details */}
      <motion.div 
        className={`relative rounded-xl overflow-hidden ${
          darkMode 
            ? 'bg-gray-800 shadow-lg' 
            : 'bg-white shadow-md'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <AnimatePresence mode="wait">
          {selectedElement ? (
            <motion.div
              key="element-details"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ElementDetails 
                element={selectedElement} 
                onViewDetailsClick={openModal}
                use3D={use3D}
                onToggle3D={toggle3DMode}
                darkMode={darkMode}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center text-center py-20 px-6"
            >
              <motion.div 
                className="text-6xl mb-6"
                animate={{ 
                  y: [0, -15, 0],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut"
                }}
              >
                ⚛️
              </motion.div>
              <h3 className="text-xl md:text-2xl font-bold mb-3">Select an element to view details</h3>
              <p className="text-sm md:text-base opacity-70 max-w-md">
                Discover properties, electron configurations, and {use3D ? '3D' : '2D'} visualizations
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Element Modal */}
      <AnimatePresence>
        {showModal && selectedElement && (
          <ElementModal
            element={selectedElement}
            onClose={closeModal}
            use3D={use3D}
            onToggle3D={toggle3DMode}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>
      
      {/* Legend */}
      <div className={`mt-2 p-6 rounded-xl ${
        darkMode 
          ? 'bg-gray-800 shadow-lg' 
          : 'bg-white shadow-md'
      }`}>
        <h3 className="text-lg font-semibold mb-4 text-center">Element Categories</h3>
        <div className="flex flex-wrap justify-center gap-3">
          {Object.entries(colorMap).map(([group, color]) => (
            <motion.div 
              key={group}
              className={`flex items-center py-1.5 px-3 rounded-full ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div 
                className="w-4 h-4 rounded-sm mr-2 shadow-sm" 
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-sm font-medium">
                {group.charAt(0).toUpperCase() + group.slice(1)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-2 text-center text-xs opacity-60 py-3">
        <p>Data sourced from International Union of Pure and Applied Chemistry (IUPAC)</p>
      </footer>
    </div>
  );
};

export default PeriodicTable;