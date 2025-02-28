import React from 'react';
import { Element } from '../../types/PeriodicTableTypes';

interface ElementModel2DProps {
  element: Element;
  containerSize?: { width: number; height: number };
}

const ElementModel2D: React.FC<ElementModel2DProps> = ({ 
  element, 
  containerSize = { width: 500, height: 500 }
}) => {
  // Parse electron configuration
  const shells = element.electrons.split(',').map(n => parseInt(n));
  
  // Calculate center and scaling
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const scale = Math.min(containerSize.width, containerSize.height) / 350;
  
  // Get color for electron shell based on index
  const getShellColor = (index: number): string => {
    const colors = [
      '#2196f3', // Blue
      '#4caf50', // Green
      '#ffeb3b', // Yellow
      '#ff9800', // Orange
      '#e91e63', // Pink
      '#9c27b0', // Purple
      '#00bcd4'  // Cyan
    ];
    
    return colors[index % colors.length];
  };
  
  return (
    <div className="model-container-2d" style={{ width: containerSize.width, height: containerSize.height }}>
      <svg 
        width={containerSize.width} 
        height={containerSize.height} 
        className="electron-shells"
      >
        
        {/* Nucleus */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={15 * scale} 
          fill="#f44336"
        />
        <text 
          x={centerX} 
          y={centerY} 
          fontSize={12 * scale} 
          textAnchor="middle" 
          fill="white" 
          dominantBaseline="middle"
        >
          {element.symbol}
        </text>
        
        {/* Electron shells */}
        {shells.map((electronsInShell, shellIndex) => {
          const shellRadius = (25 + shellIndex * 20) * scale;
          const shellColor = getShellColor(shellIndex);
          
          // Draw the shell circle
          const shellElements = [
            <g key={`shell-group-${shellIndex}`}>
              <circle 
                key={`shell-${shellIndex}`}
                cx={centerX} 
                cy={centerY} 
                r={shellRadius} 
                fill="none" 
                stroke={shellColor} 
                strokeWidth={1 * scale} 
                strokeDasharray="3,3"
              />
            </g>
          ];
          
          // Draw electrons in this shell
          for (let i = 0; i < electronsInShell; i++) {
            const angle = (i * 2 * Math.PI) / electronsInShell;
            const x = centerX + shellRadius * Math.cos(angle);
            const y = centerY + shellRadius * Math.sin(angle);
            
            shellElements.push(
              <g key={`electron-group-${shellIndex}-${i}`}>
                <circle 
                  key={`electron-${shellIndex}-${i}`}
                  cx={x} 
                  cy={y} 
                  r={4 * scale} 
                  fill={shellColor}
                >
                  <animate 
                    attributeName="opacity"
                    values="0.7;1;0.7"
                    dur={`${1 + shellIndex * 0.5}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          }
          
          return shellElements;
        })}
    
      </svg>

      <style>{`
        .model-container-2d {
          background-color: rgba(255, 255, 255, 0.8);
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          padding: 10px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ElementModel2D;