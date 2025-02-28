import React, { useEffect } from 'react';
import { Element } from '../../types/PeriodicTableTypes';
import { colorMap } from './Data';
import ElementModel3D from './ElementModal3D';
import ElementModel2D from './ElementModel2D';
import { X } from 'lucide-react';

interface ElementModalProps {
  element: Element;
  onClose: () => void;
  use3D: boolean;
  onToggle3D: () => void;
}

const ElementModal: React.FC<ElementModalProps> = ({ 
  element, 
  onClose, 
  use3D,
  onToggle3D
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ backgroundColor: colorMap[element.group] }}>
          <div className="element-header-content">
            <div className="element-number">{element.number}</div>
            <div className="element-symbol">{element.symbol}</div>
            <div className="element-name">{element.name}</div>
            <div className="element-mass">
              {typeof element.mass === 'number' ? element.mass.toFixed(2) : element.mass} u
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="visualization-container">
          {use3D ? (
            <ElementModel3D 
              element={element}
              containerSize={{ width: 600, height: 400 }}
            />
          ) : (
            <ElementModel2D 
              element={element} 
              containerSize={{ width: 600, height: 400 }} 
            />
          )}
        </div>
        
        <div className="model-controls">
          <label className="toggle-container">
            <input 
              type="checkbox" 
              checked={use3D}
              onChange={onToggle3D}
            />
            <div className="toggle-switch"></div>
            <span className="toggle-text">{use3D ? '3D Model' : '2D Model'}</span>
          </label>
          
          <div className="element-info">
            <div className="info-section">
              <h3>Element Information</h3>
              <p><strong>Atomic Number:</strong> {element.number}</p>
              <p><strong>Group:</strong> {element.group.charAt(0).toUpperCase() + element.group.slice(1)}</p>
              <p><strong>Period:</strong> {element.period}</p>
              <p><strong>Atomic Mass:</strong> {typeof element.mass === 'number' ? element.mass.toFixed(2) : element.mass} u</p>
              <p><strong>Electron Configuration:</strong> {element.electrons.replace(/,/g, '-')}</p>
            </div>
            
            <div className="info-section">
              <h3>Description</h3>
              <p>{element.description}</p>
            </div>
          </div>
        </div>
        
        {use3D && (
          <div className="interaction-help">
            <h4>3D Model Legend:</h4>
            <ul>
              <li><span className="help-dot" style={{ backgroundColor: '#f44336' }}></span> Nucleus (protons and neutrons)</li>
              <li><span className="help-dot" style={{ backgroundColor: '#2196f3' }}></span> First shell electrons</li>
              <li><span className="help-dot" style={{ backgroundColor: '#4caf50' }}></span> Second shell electrons</li>
              <li><span className="help-dot" style={{ backgroundColor: '#ffeb3b' }}></span> Third shell electrons</li>
              <li><span className="help-dot" style={{ backgroundColor: '#ff9800' }}></span> Fourth shell electrons</li>
            </ul>
            <p><small>Note: The model is a simplified representation of the atomic structure.</small></p>
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        
        .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
        }
        
        .element-header-content {
          display: grid;
          grid-template-columns: auto 1fr auto;
          grid-template-rows: auto auto;
          grid-template-areas:
            "number symbol mass"
            "number name mass";
          align-items: center;
          width: 100%;
        }
        
        .element-number {
          grid-area: number;
          font-size: 24px;
          padding-right: 15px;
        }
        
        .element-symbol {
          grid-area: symbol;
          font-size: 42px;
          font-weight: bold;
        }
        
        .element-name {
          grid-area: name;
          font-size: 20px;
        }
        
        .element-mass {
          grid-area: mass;
          font-size: 16px;
          text-align: right;
        }
        
        .close-button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 15px;
          padding: 5px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .close-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .visualization-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          background-color: #f5f5f5;
        }
        
        .model-controls {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .toggle-container {
          display: flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        
        .toggle-switch {
          position: relative;
          width: 50px;
          height: 24px;
          background-color: #ccc;
          border-radius: 12px;
          margin: 0 10px;
          transition: background-color 0.3s;
        }
        
        .toggle-switch:before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.3s;
        }
        
        input:checked + .toggle-switch {
          background-color: #4a6fff;
        }
        
        input:checked + .toggle-switch:before {
          transform: translateX(26px);
        }
        
        input[type="checkbox"] {
          display: none;
        }
        
        .toggle-text {
          font-weight: bold;
        }
        
        .element-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .info-section {
          border: 1px solid #eee;
          border-radius: 6px;
          padding: 15px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .info-section h3 {
          margin-top: 0;
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
        }
        
        .interaction-help {
          padding: 15px 20px;
          border-top: 1px solid #eee;
          background-color: #f9f9f9;
        }
        
        .interaction-help h4 {
          margin-bottom: 10px;
          color: #333;
        }
        
        .interaction-help ul {
          list-style: none;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .interaction-help li {
          display: flex;
          align-items: center;
          margin-right: 15px;
          background-color: white;
          padding: 5px 10px;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .help-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 8px;
          display: inline-block;
        }
        
        @media (max-width: 768px) {
          .element-info {
            grid-template-columns: 1fr;
          }
          
          .interaction-help ul {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ElementModal;