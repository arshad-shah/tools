import React from 'react';
import { RefreshCw, Save, Search } from 'lucide-react';

interface ColorDisplayProps {
  hexCode: string;
  rgbString: string;
  textColor: string;
  colorNameSuggestion: string;
  generateRandomColor: () => void;
  saveColor: () => void;
}

const ColorDisplay: React.FC<ColorDisplayProps> = ({ 
  hexCode, 
  rgbString, 
  textColor, 
  colorNameSuggestion, 
  generateRandomColor, 
  saveColor 
}) => {
  return (
    <div className="relative">
      {/* Main Color Display */}
      <div 
        className="w-full h-72 rounded-3xl shadow-lg flex flex-col items-center justify-center transition-all duration-300 overflow-hidden group relative"
        style={{ backgroundColor: rgbString }}
      >
        {/* Floating Circles Decoration */}
        <div className="absolute top-6 left-6 flex space-x-2 opacity-80">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        
        {/* Color Value Display */}
        <div className="backdrop-blur-md bg-black/30 px-6 py-4 rounded-2xl shadow-lg border border-white/20 transform transition-all duration-300 group-hover:scale-105">
          <span style={{ color: 'white' }} className="font-mono text-2xl font-bold tracking-wide">
            {hexCode}
          </span>
        </div>
        
        {/* Color Name Tag */}
        <div 
          className="absolute bottom-6 left-6 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md shadow-md border border-white/20 flex items-center"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
        >
          <Search size={14} className="mr-2" />
          {colorNameSuggestion}
        </div>
        
        {/* Quick Actions Floating Panel */}
        <div className="absolute top-6 right-6 flex flex-col space-y-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
          <button 
            className="bg-indigo-500 p-3 rounded-full hover:bg-indigo-600 transition-all duration-200 shadow-lg border border-indigo-400 text-white"
            onClick={generateRandomColor}
            title="Generate random color"
          >
            <RefreshCw size={18} />
          </button>
          
          <button 
            className="bg-indigo-500 p-3 rounded-full hover:bg-indigo-600 transition-all duration-200 shadow-lg border border-indigo-400 text-white"
            onClick={saveColor}
            title="Save to palette"
          >
            <Save size={18} />
          </button>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-3/4 h-6 bg-black/5 blur-xl rounded-full"></div>
      
      {/* Extra Decoration for Visual Interest */}
      <div className="absolute -top-2 -right-2 w-12 h-12 bg-indigo-500 rounded-full opacity-30 blur-xl"></div>
      <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-indigo-600 rounded-full opacity-30 blur-xl"></div>
    </div>
  );
};

export default ColorDisplay;