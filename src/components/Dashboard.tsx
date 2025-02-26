// src/components/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getEnabledTools } from '../data/ToolDefinitions';
import { ToolDefinition } from '../types/ToolTypes';

/**
 * Dashboard component that displays all available tools
 */
const Dashboard: React.FC = () => {
  const [tools] = useState<ToolDefinition[]>(getEnabledTools());
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  // Filter tools based on search query
  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Navigate to a tool
  const navigateToTool = (id: string) => {
    navigate(`/${id}`);
  };

  // Animate cards in on load
  useEffect(() => {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('animate-in');
      }, index * 100);
    });
  }, [filteredTools]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      {/* Background animated elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: `${Math.random() * 300 + 50}px`,
              height: `${Math.random() * 300 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`,
              animation: `float ${Math.random() * 10 + 20}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Tool Dashboard
            </h1>
            <p className="text-gray-400 mt-2">All your tools in one beautiful interface</p>
          </div>
          
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search tools..."
              className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-700 bg-gray-800 bg-opacity-50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>
        
        {/* Tool Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="tool-card bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg border border-gray-700 hover:border-gray-500 transition-all duration-300 opacity-0 transform translate-y-4 scale-95"
              style={{ transitionDelay: '0.1s' }}
              onClick={() => navigateToTool(tool.id)}
            >
              <div className={`h-2 w-full ${tool.color}`}></div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${tool.color} bg-opacity-20`}>
                    <tool.icon size={28} className={`text-white`} />
                  </div>
                  
                  {tool.version && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
                      v{tool.version}
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold mb-2">{tool.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{tool.description}</p>
                
                <div className="flex justify-end">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToTool(tool.id);
                    }}
                    className="text-white opacity-60 hover:opacity-100 flex items-center transition-opacity duration-200"
                  >
                    <span className="text-sm font-medium mr-1">Open</span>
                    <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform duration-200" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-in {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: all 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;