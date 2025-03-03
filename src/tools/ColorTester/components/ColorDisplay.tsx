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
    <div 
      className="w-full h-64 rounded-2xl shadow-lg mb-4 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden color-display group"
      style={{ backgroundColor: rgbString }}
    >
      <div className="backdrop-blur-sm bg-black/10 px-5 py-3 rounded-xl shadow-sm border border-white/20">
        <span style={{ color: textColor }} className="font-mono text-xl font-bold tracking-wide">
          {hexCode}
        </span>
      </div>
      
      <div 
        className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm shadow-sm border border-white/20"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: textColor }}
      >
        <div className="flex items-center">
          <Search size={14} className="mr-1.5" />
          {colorNameSuggestion}
        </div>
      </div>
      
      <div className="absolute top-0 right-0 p-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-sm border border-white/30 text-white"
          onClick={generateRandomColor}
          title="Generate random color"
        >
          <RefreshCw size={18} />
        </button>
        
        <button 
          className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-sm border border-white/30 text-white"
          onClick={saveColor}
          title="Save to palette"
        >
          <Save size={18} />
        </button>
      </div>
      
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-full opacity-80"></div>
          <div className="w-3 h-3 bg-amber-500 rounded-full opacity-80"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full opacity-80"></div>
        </div>
      </div>
    </div>
  );
};

export default ColorDisplay;