import React from 'react';
import { Droplet, ChevronDown, Sliders, Pipette } from 'lucide-react';

interface ColorEditorProps {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  hexCode: string;
  setRed: (value: number) => void;
  setGreen: (value: number) => void;
  setBlue: (value: number) => void;
  setAlpha: (value: number) => void;
  handleColorPicker: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showEditorsPanel: boolean;
  setShowEditorsPanel: (show: boolean) => void;
}

const ColorEditor: React.FC<ColorEditorProps> = ({
  red,
  green,
  blue,
  alpha,
  hexCode,
  setRed,
  setGreen,
  setBlue,
  setAlpha,
  handleColorPicker,
  showEditorsPanel,
  setShowEditorsPanel
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-indigo-100 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white flex items-center">
          <Sliders size={18} className="mr-2" />
          Color Editor
        </h2>
        
        <button
          onClick={() => setShowEditorsPanel(!showEditorsPanel)}
          className="text-white flex items-center bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
        >
          <ChevronDown size={16} className={`mr-1.5 transform transition-transform duration-300 ${showEditorsPanel ? 'rotate-180' : ''}`} />
          {showEditorsPanel ? 'Hide Controls' : 'Show Controls'}
        </button>
      </div>
      
      {showEditorsPanel && (
        <div className="p-6 space-y-6">
          {/* Color Picker */}
          <div className="bg-indigo-50 rounded-2xl p-5 shadow-sm relative">
            <div className="flex items-center mb-3">
              <Pipette size={16} className="mr-2 text-indigo-600" />
              <h3 className="text-sm font-medium text-gray-700">Color Picker</h3>
            </div>
            
            <input
              type="color"
              value={hexCode}
              onChange={handleColorPicker}
              className="w-full h-16 cursor-pointer rounded-xl overflow-hidden"
              style={{ 
                WebkitAppearance: 'none',
                appearance: 'none',
                background: 'transparent',
                border: 'none'
              }}
            />
          </div>
          
          {/* RGB Sliders */}
          <div className="space-y-4">
            {/* Red Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  Red
                </label>
                <span className="text-sm font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded-md">
                  {red}
                </span>
              </div>
              
              <div className="relative h-10 flex items-center">
                <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-200 to-red-500"
                    style={{ width: `${(red / 255) * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={red}
                  onChange={(e) => setRed(parseInt(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute h-5 w-5 bg-white rounded-full shadow-md border-2 border-red-400 transform -translate-y-1/2 top-1/2 pointer-events-none"
                  style={{ left: `calc(${(red / 255) * 100}% - 10px)` }}
                ></div>
              </div>
            </div>
            
            {/* Green Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  Green
                </label>
                <span className="text-sm font-mono bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                  {green}
                </span>
              </div>
              
              <div className="relative h-10 flex items-center">
                <div className="w-full h-2 bg-green-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-200 to-green-500"
                    style={{ width: `${(green / 255) * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={green}
                  onChange={(e) => setGreen(parseInt(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute h-5 w-5 bg-white rounded-full shadow-md border-2 border-green-400 transform -translate-y-1/2 top-1/2 pointer-events-none"
                  style={{ left: `calc(${(green / 255) * 100}% - 10px)` }}
                ></div>
              </div>
            </div>
            
            {/* Blue Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  Blue
                </label>
                <span className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                  {blue}
                </span>
              </div>
              
              <div className="relative h-10 flex items-center">
                <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-200 to-blue-500"
                    style={{ width: `${(blue / 255) * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={blue}
                  onChange={(e) => setBlue(parseInt(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute h-5 w-5 bg-white rounded-full shadow-md border-2 border-blue-400 transform -translate-y-1/2 top-1/2 pointer-events-none"
                  style={{ left: `calc(${(blue / 255) * 100}% - 10px)` }}
                ></div>
              </div>
            </div>
            
            {/* Alpha Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Droplet size={16} className="mr-2 text-gray-500" />
                  Opacity
                </label>
                <span className="text-sm font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md">
                  {(alpha * 100).toFixed(0)}%
                </span>
              </div>
              
              <div className="relative h-10 flex items-center">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gray-200 to-gray-500"
                    style={{ width: `${alpha * 100}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer"
                />
                <div 
                  className="absolute h-5 w-5 bg-white rounded-full shadow-md border-2 border-gray-400 transform -translate-y-1/2 top-1/2 pointer-events-none"
                  style={{ left: `calc(${alpha * 100}% - 10px)` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorEditor;