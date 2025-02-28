import React, { useState } from 'react';
import { elements, colorMap } from './Data';
import { Element } from '../../types/PeriodicTableTypes';
import ElementGrid from './ElementGrid';
import ElementDetails from './ElementDetails';
import ElementModal from './ElementModal';

const PeriodicTable: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [use3D, setUse3D] = useState(true);

  // Handle element selection
  const handleElementClick = (element: Element | null) => {
    setSelectedElement(element);
  };

  // Toggle 3D/2D visualization
  const toggle3DMode = () => {
    setUse3D(!use3D);
  };

  // Open modal with visualization
  const openModal = () => {
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="periodic-table-container">
      <div className="header">
        <h1>Interactive Periodic Table</h1>
        <p>Click on elements to see details and electron configurations.</p>
      </div>
      
      {/* Element Grid */}
      <ElementGrid 
        selectedElement={selectedElement} 
        onElementClick={handleElementClick}
      />
      
      {/* Element Details */}
      <div className="interaction-area">
        {selectedElement && (
          <ElementDetails 
            element={selectedElement} 
            onViewDetailsClick={openModal}
            use3D={use3D}
            onToggle3D={toggle3DMode}
          />
        )}
      </div>
      
      {/* Element Modal */}
      {showModal && selectedElement && (
        <ElementModal
          element={selectedElement}
          onClose={closeModal}
          use3D={use3D}
          onToggle3D={toggle3DMode}
        />
      )}
      
      {/* Legend */}
      <div className="legend">
        {Object.entries(colorMap).map(([group, color]) => (
          <div key={group} className="legend-item">
            <div className="legend-color" style={{ backgroundColor: color }}></div>
            <div className="legend-label">{group.charAt(0).toUpperCase() + group.slice(1)}</div>
          </div>
        ))}
      </div>

      <style>{`
        .periodic-table-container {
          font-family: 'Roboto', 'Helvetica Neue', sans-serif;
          max-width: 100%;
          margin: 0 auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background-color: #f5f5f5;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        
        .header h1 {
          margin-bottom: 8px;
          color: #333;
        }
        
        .header p {
          color: #666;
          font-size: 16px;
        }
        
        .interaction-area {
          display: flex;
          gap: 20px;
          margin-top: 20px;
          min-height: 300px;
        }
        
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
          justify-content: center;
          background: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          margin-right: 10px;
        }
        
        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          margin-right: 5px;
        }
        
        .legend-label {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default PeriodicTable;