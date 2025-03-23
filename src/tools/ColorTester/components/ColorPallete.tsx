import React from 'react';
import { Palette, Download, Trash2, Plus, Bookmark } from 'lucide-react';
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
    <div id="palette-section" className="bg-white rounded-3xl shadow-lg border border-indigo-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Palette size={18} className="mr-2 text-white" />
          <h2 className="text-lg font-medium text-white">My Color Palette</h2>
          <span className="ml-2 bg-white/20 text-white text-xs font-medium px-2.5 py-1 rounded-full">
            {savedColors.length} colors
          </span>
        </div>
        
        <div className="flex space-x-2">
          
          <button 
            onClick={exportPalette}
            className="bg-white text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors"
            title="Export palette"
          >
            <Download size={15} className="mr-1.5" />
            Export
          </button>
        </div>
      </div>
      
      {/* Palette Content */}
      <div className="p-6">
        {savedColors.length === 0 ? (
          <div className="py-10 text-center">
            <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette size={24} className="text-indigo-400" />
            </div>
            <h3 className="text-gray-700 font-medium mb-1">No colors saved yet</h3>
            <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
              Save colors to build your palette. Colors will appear here for easy access and export.
            </p>
            <button className="bg-indigo-100 text-indigo-600 hover:bg-indigo-200 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center transition-colors">
              <Bookmark size={15} className="mr-1.5" />
              Save current color
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
              {savedColors.map((color, index) => (
                <div key={index} className="relative group">
                  <button
                    className="w-full aspect-square rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 group-hover:scale-105"
                    style={{ backgroundColor: color.rgb }}
                    onClick={() => loadColor(color)}
                    title={color.hex}
                    aria-label={`Load color ${color.name || color.hex}`}
                  >
                    <span className="sr-only">Load color {color.name || color.hex}</span>
                  </button>
                  
                  {/* Color Info Tooltip */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 bg-white px-3 py-2 rounded-lg shadow-lg text-center z-10 min-w-max">
                    <p className="font-medium text-xs text-gray-800">{color.name || "Unnamed Color"}</p>
                    <p className="font-mono text-xs text-gray-600">{color.hex}</p>
                  </div>
                  
                  {/* Delete Button */}
                  <button 
                    className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 border border-gray-200"
                    onClick={(e) => deleteColor(index, e)}
                    title="Remove color"
                    aria-label={`Remove color ${color.name || color.hex}`}
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
              
              {/* Add More Color Placeholder */}
              <div className="w-full aspect-square rounded-xl border-2 border-dashed border-indigo-200 flex items-center justify-center cursor-pointer hover:border-indigo-300 transition-colors bg-indigo-50/50 hover:bg-indigo-50">
                <div className="flex flex-col items-center">
                  <Plus size={24} className="text-indigo-400" />
                  <span className="text-xs text-indigo-500 font-medium mt-1">Add</span>
                </div>
              </div>
            </div>
            
            {/* Collection Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{savedColors.length}</span> colors collected
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ColorPalette;