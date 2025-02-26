// src/components/ToolLayout.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ToolComponent, ToolDefinition } from '../types/ToolTypes';

interface ToolLayoutProps {
  definition: ToolDefinition;
  ToolComponent: ToolComponent;
}

/**
 * Shared layout wrapper for all tools
 * Provides consistent header and navigation
 */
const ToolLayout: React.FC<ToolLayoutProps> = ({ definition, ToolComponent }) => {
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Tool Header */}
      <header className={`${definition.color} p-4 shadow-md`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="bg-black bg-opacity-20 p-2 rounded-lg hover:bg-opacity-30 transition-all duration-200 text-white"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </Link>
            
            <div className="flex items-center space-x-3">
              <div className="bg-black bg-opacity-20 p-2 rounded-lg text-white">
                <definition.icon size={24} />
              </div>
              <h1 className="text-xl font-bold text-white">{definition.name}</h1>
              {definition.version && (
                <span className="text-xs bg-black bg-opacity-20 px-2 py-1 rounded text-white">
                  v{definition.version}
                </span>
              )}
            </div>
          </div>
        
        </div>
      </header>
      
      {/* Tool Content */}
      <main className="max-w-6xl mx-auto p-6">
        <ToolComponent definition={definition} />
      </main>
    </div>
  );
};

export default ToolLayout;