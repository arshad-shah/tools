// src/components/ToolLayout.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ToolComponent, ToolDefinition } from '../types/ToolTypes';

interface ToolLayoutProps {
  definition: ToolDefinition;
  ToolComponent: ToolComponent;
}

/**
 * Shared layout wrapper for all tools
 * Provides consistent header and navigation with modern design elements
 */
const ToolLayout: React.FC<ToolLayoutProps> = ({ definition, ToolComponent }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800">
      {/* Decorative background elements */}
      <div className="fixed inset-0 z-0 opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-purple-600 blur-3xl"></div>
        <div className="absolute top-1/4 -left-40 w-80 h-80 rounded-full bg-blue-600 blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-cyan-600 blur-3xl"></div>
      </div>
      
      {/* Tool Header with glass effect */}
      <header className={`sticky top-0 z-10 backdrop-blur-md bg-opacity-80 bg-slate-900 border-b border-slate-700`}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="p-2 rounded-full hover:bg-slate-800 transition-all duration-200 text-slate-300 hover:text-white"
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </Link>
              
              <div className="flex items-center space-x-3">
                <div className={`${definition.color} p-3 rounded-lg text-white shadow-lg`}>
                  <definition.icon size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">{definition.name}</h1>
                  {definition.version && (
                    <span className="text-xs font-medium bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                      v{definition.version}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Tool Content */}
      <main className="relative z-1 max-w-6xl mx-auto p-6">
        <div className="bg-slate-900 bg-opacity-60 backdrop-blur-sm rounded-xl shadow-xl border border-slate-800 p-6">
          <ToolComponent definition={definition} />
        </div>
      </main>
    
    </div>
  );
};

export default ToolLayout;