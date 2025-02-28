import React from 'react';
import { Element } from '../../types/PeriodicTableTypes';
import { colorMap } from './Data';

interface ElementDetailsProps {
  element: Element;
  onViewDetailsClick: () => void;
  use3D: boolean;
  onToggle3D: () => void;
}

const ElementDetails: React.FC<ElementDetailsProps> = ({ 
  element, 
  onViewDetailsClick,
  use3D,
  onToggle3D
}) => {
  return (
    <div className="element-details">
      <div className="element-header" style={{ backgroundColor: colorMap[element.group] }}>
        <div className="element-number-large">{element.number}</div>
        <div className="element-symbol-large">{element.symbol}</div>
        <div className="element-name-large">{element.name}</div>
        <div className="element-mass-large">
          {typeof element.mass === 'number' ? element.mass.toFixed(2) : element.mass} u
        </div>
      </div>
      
      <div className="element-structure">
        <div className="element-data">
          <div><strong>Group:</strong> {element.group.charAt(0).toUpperCase() + element.group.slice(1)}</div>
          <div><strong>Period:</strong> {element.period}</div>
          <div><strong>Electron config:</strong> {element.electrons}</div>
          <div className="element-description">{element.description}</div>
          
          <div className="element-actions">
            <button 
              className="view-button"
              onClick={onViewDetailsClick}
            >
              View {use3D ? '3D' : '2D'} Model
            </button>
            
            <label className="toggle-container">
              <input 
                type="checkbox" 
                checked={use3D}
                onChange={onToggle3D}
              />
              <span className="toggle-text">Use 3D Model</span>
            </label>
          </div>
        </div>
      </div>

      <style>{`
        .element-details {
          flex: 1;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .element-header {
          padding: 15px;
          color: white;
          display: grid;
          grid-template-columns: auto 1fr auto;
          grid-template-rows: auto auto;
          grid-template-areas:
            "number symbol mass"
            "number name mass";
          align-items: center;
        }
        
        .element-number-large {
          grid-area: number;
          font-size: 24px;
          padding-right: 10px;
        }
        
        .element-symbol-large {
          grid-area: symbol;
          font-size: 42px;
          font-weight: bold;
        }
        
        .element-name-large {
          grid-area: name;
          font-size: 20px;
        }
        
        .element-mass-large {
          grid-area: mass;
          font-size: 16px;
        }
        
        .element-structure {
          display: flex;
          padding: 20px;
          background-color: #fff;
        }
        
        .element-data {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .element-description {
          margin-top: 10px;
          font-style: italic;
          color: #555;
        }
        
        .element-actions {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .view-button {
          padding: 10px 15px;
          background-color: #4a6fff;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .view-button:hover {
          background-color: #3a5aea;
        }
        
        .toggle-container {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .toggle-container input {
          margin-right: 8px;
        }
        
        .toggle-text {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default ElementDetails;