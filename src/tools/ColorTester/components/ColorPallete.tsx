import React from 'react';
import { Palette, Download, Trash2 } from 'lucide-react';
import { ColorInfo } from '../../../types/ColorTesterTypes';

interface ColorPaletteProps {
  savedColors: ColorInfo[];
  loadColor: (colorInfo: ColorInfo) => void;
  deleteColor: (index: number, e: React.MouseEvent) => void;
  exportPalette: () => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  savedColors,
  loadColor,
  deleteColor,
  exportPalette
}) => {
  return (
    <div id="palette-section" className="p-5 bg-white rounded-xl shadow-md border border-gray-100 transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Palette size={16} className="mr-1.5 text-indigo-500" />
          <h2 className="text-sm font-medium text-gray-700">Color Palette</h2>
          <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {savedColors.length} colors
          </span>
        </div>
        
        <button 
          onClick={exportPalette}
          className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
          title="Export palette"
        >
          <Download size={14} className="mr-1.5" />
          Export Palette
        </button>
      </div>
      
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
        {savedColors.map((color, index) => (
          <div key={index} className="relative group">
            <button
              className="w-full aspect-square rounded-lg shadow-sm hover:shadow transition-shadow border border-gray-200 group-hover:scale-105 duration-200"
              style={{ backgroundColor: color.rgb }}
              onClick={() => loadColor(color)}
              title={color.hex}
            >
              <span className="sr-only">Load color {color.hex}</span>
            </button>
            
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 bg-white px-2 py-1 rounded shadow-md text-center z-10 whitespace-nowrap text-xs">
              {color.hex}
            </div>
            
            <button 
              className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
              onClick={(e) => deleteColor(index, e)}
              title="Remove color"
            >
              <Trash2 size={12} className="text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorPalette;