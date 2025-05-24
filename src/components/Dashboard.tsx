import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star } from 'lucide-react';
import { getEnabledTools } from '../data/ToolDefinitions';
import { ToolDefinition } from '../types/ToolTypes';

/**
 * Dashboard component that displays all available tools
 */
const Dashboard: React.FC = () => {
  const [tools] = useState<ToolDefinition[]>(getEnabledTools());
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();
  
  // Extract unique categories on component mount
  useEffect(() => {
    const uniqueCategories = [...new Set(tools.map(tool => tool.category).filter(Boolean))];
    setCategories(uniqueCategories as string[]);
  }, [tools]);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteTools');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage when changed
  useEffect(() => {
    localStorage.setItem('favoriteTools', JSON.stringify(favorites));
  }, [favorites]);

  // Filter tools based on search query and category
  const filteredTools = tools.filter(tool => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || tool.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Navigate to a tool
  const navigateToTool = (id: string) => {
    navigate(`/${id}`);
  };

  // Toggle favorite status
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Animate cards in on load
  useEffect(() => {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('animate-in');
      }, index * 50);
    });
  }, [filteredTools]);

  // Clear search input
  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white pb-20">
      {/* Background animated elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(30)].map((_, i) => (
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

      {/* Hero Header */}
      <div className="relative w-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
          <h1 className="text-5xl font-bold tracking-tight text-white mb-4">
            Tools <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Dashboard</span>
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl">
            A curated collection of essential development utilities and productivity tools, crafted with precision
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10 -mt-8">
        {/* Search and filters */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-4 border border-slate-700 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search tools..."
                className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-600 bg-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X size={18} className="text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
            
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    !selectedCategory 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                  onClick={() => setSelectedCategory('')}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === category 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Star size={20} className="text-yellow-400 mr-2" />
              Favorites
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools
                .filter(tool => favorites.includes(tool.id))
                .map((tool) => renderToolCard(tool))}
            </div>
          </div>
        )}
        
        {/* Tool Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {selectedCategory ? selectedCategory : 'All Tools'}
            {filteredTools.length > 0 && <span className="text-slate-400 ml-2 text-sm font-normal">({filteredTools.length})</span>}
          </h2>
          
          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => renderToolCard(tool))}
            </div>
          ) : (
            <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-slate-700">
              <p className="text-slate-400">No tools found matching your search criteria</p>
              <button 
                onClick={clearSearch}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}
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
          transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
  
  // Helper function to render tool cards
  function renderToolCard(tool: ToolDefinition) {
    const isFavorite = favorites.includes(tool.id);
    
    return (
      <div
        key={tool.id}
        className="tool-card bg-slate-800/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-slate-700 hover:border-slate-500 hover:shadow-blue-900/10 hover:shadow-2xl transition-all duration-300 opacity-0 transform translate-y-4 scale-95 group hover:cursor-pointer"
        style={{ transitionDelay: '0.05s' }}
        onClick={() => navigateToTool(tool.id)}
      >
        <div className={`h-1 w-full ${tool.color}`}></div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <div className={`p-3 rounded-xl ${tool.color} bg-opacity-20 transition-transform group-hover:scale-110 duration-300 `}>
              <tool.icon size={24} className="text-white" />
            </div>
            
            <div className="flex items-center gap-2">
              {tool.version && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-700 text-slate-300">
                  v{tool.version}
                </span>
              )}
              
              <button
                onClick={(e) => toggleFavorite(e, tool.id)}
                className="p-1.5 rounded-full hover:bg-slate-700/70 transition-colors hover:cursor-pointer"
              >
                <Star 
                  size={16} 
                  className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-slate-400"} 
                />
              </button>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold mb-2 text-white">{tool.name}</h3>
          <p className="text-slate-300 text-sm mb-6 line-clamp-2">{tool.description}</p>
        </div>
      </div>
    );
  }
};

export default Dashboard;