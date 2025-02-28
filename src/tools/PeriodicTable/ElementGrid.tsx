import React from 'react';
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
            const style = {
              gridRow: period,
              gridColumn: `3 / span 15`,
              backgroundColor: period === 6 ? colorMap.lanthanide : colorMap.actinide,
              color: 'white',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 'bold'
            };
            
            grid.push(
              <div 
                key={`placeholder-${period}`} 
                style={style}
                className="element-placeholder"
              >
                {period === 6 ? 'Lanthanides (57-71)' : 'Actinides (89-103)'}
              </div>
            );
          }
          continue; // Skip individual cells in the lanthanide/actinide rows
        }
        
        // Position in the grid based on period and column
        const style = {
          gridRow: period,
          gridColumn: column
        };
        
        if (element) {
          const isSelected = selectedElement && selectedElement.symbol === element.symbol;
          
          grid.push(
            <div
              key={element.symbol}
              className={`element ${element.group} ${isSelected ? 'selected' : ''}`}
              style={{
                ...style,
                backgroundColor: colorMap[element.group],
                zIndex: isSelected ? 2 : 1
              }}
              onClick={() => onElementClick(isSelected ? null : element as Element)}
            >
              <div className="element-number">{element.number}</div>
              <div className="element-symbol">{element.symbol}</div>
              <div className="element-name">{element.name}</div>
              <div className="element-mass">{typeof element.mass === 'number' ? element.mass.toFixed(1) : element.mass}</div>
            </div>
          );
        } else {
          // Empty cell
          grid.push(<div key={`empty-${period}-${column}`} className="element-empty" style={style}></div>);
        }
      }
    }
    return grid;
  };

  return (
    <div className="periodic-table">
      {renderGrid()}
      
      <style>{`
        .periodic-table {
          display: grid;
          grid-template-columns: repeat(18, minmax(48px, 1fr));
          grid-template-rows: repeat(9, minmax(48px, auto));
          gap: 3px;
          margin-bottom: 20px;
        }
        
        .element {
          border-radius: 4px;
          padding: 4px;
          position: relative;
          transition: all 0.2s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          min-height: 60px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .element.selected {
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          outline: 3px solid #333;
        }
        
        .element:hover:not(.selected) {
          transform: translateY(-2px);
          box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        }
        
        .element-number {
          font-size: 10px;
          text-align: left;
        }
        
        .element-symbol {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
        }
        
        .element-name {
          font-size: 9px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .element-mass {
          font-size: 9px;
          text-align: right;
        }
        
        .element-empty {
          background: transparent;
        }
        
        .element-placeholder {
          border-radius: 4px;
          padding: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default ElementGrid;