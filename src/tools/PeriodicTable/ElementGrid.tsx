import React from 'react';
import { motion } from 'framer-motion';
import { elements, colorMap } from './Data';
import { Element } from '../../types/PeriodicTableTypes';

interface ElementGridProps {
  selectedElement: Element | null;
  onElementClick: (element: Element | null) => void;
}

const ElementGrid: React.FC<ElementGridProps> = ({ selectedElement, onElementClick }) => {
  // Build the periodic table grid
  const renderGrid = () => {
    const grid = [];
    const maxPeriod = 9; // Including separate rows for lanthanides and actinides
    const maxColumn = 18;

    // Create empty grid
    for (let period = 1; period <= maxPeriod; period++) {
      for (let column = 1; column <= maxColumn; column++) {
        const element = elements.find(e => e.period === period && e.column === column);
        
        // Skip certain rows/columns for lanthanides and actinides placeholder
        if ((period === 6 && column >= 3 && column <= 17) ||
            (period === 7 && column >= 3 && column <= 17)) {
          if (column === 3) {
            // Add lanthanide/actinide placeholder cell
            const isLanthanide = period === 6;
            
            grid.push(
              <motion.div 
                key={`placeholder-${period}`} 
                className={`col-span-15 flex justify-center items-center font-bold text-black rounded-md shadow-md ${
                  isLanthanide ? 'bg-blue-300' : 'bg-purple-400'
                }`}
                style={{
                  gridRow: period,
                  gridColumn: '3 / span 15',
                }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0px 5px 15px rgba(0,0,0,0.1)" 
                }}
                transition={{ duration: 0.2 }}
              >
                {isLanthanide ? 'Lanthanides (57-71)' : 'Actinides (89-103)'}
              </motion.div>
            );
          }
          continue; // Skip individual cells in the lanthanide/actinide rows
        }
        
        // Position in the grid based on period and column
        const gridPosition = {
          gridRow: period,
          gridColumn: column
        };
        
        if (element) {
          const isSelected = selectedElement && selectedElement.symbol === element.symbol;
          
          grid.push(
            <motion.div
              key={element.symbol}
              className={`element flex flex-col rounded-md p-1 cursor-pointer relative min-h-16 shadow-sm ${isSelected ? 'border-2 border-black z-10' : 'z-0'}`}
              style={{
                ...gridPosition,
                backgroundColor: colorMap[element.group],
              }}
              onClick={() => onElementClick(isSelected ? null : element as Element)}
              whileHover={{ 
                y: -2, 
                boxShadow: "0px 3px 10px rgba(0,0,0,0.15)" 
              }}
              whileTap={{ scale: 0.98 }}
              animate={isSelected ? { 
                y: -5, 
                scale: 1.05,
                boxShadow: "0px 5px 15px rgba(0,0,0,0.2)",
                transition: { type: 'spring', stiffness: 400, damping: 17 }
              } : {}}
            >
              <div className="text-xs text-left">{element.number}</div>
              <div className="text-lg font-bold text-center">{element.symbol}</div>
              <div className="text-xs text-center truncate">{element.name}</div>
              <div className="text-xs text-right">{typeof element.mass === 'number' ? element.mass.toFixed(1) : element.mass}</div>
            
            </motion.div>
          );
        } else {
          // Empty cell
          grid.push(<div key={`empty-${period}-${column}`} className="element-empty" style={gridPosition}></div>);
        }
      }
    }
    return grid;
  };

  return (
    <div className="space-y-6">
      {/* Periodic Table Grid */}
      <div className="grid grid-cols-18 gap-1 mb-5 periodic-table">
        {renderGrid()}
      </div>
      
      {/* CSS Styles with TailwindCSS */}
      <style>{`
        .grid-cols-18 {
          grid-template-columns: repeat(18, minmax(48px, 1fr));
        }
        
        .periodic-table {
          grid-template-rows: repeat(9, minmax(48px, auto));
        }
        
        .col-span-15 {
          grid-column-end: span 15;
        }
      `}</style>
    </div>
  );
};

export default ElementGrid;