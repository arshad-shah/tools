import React from 'react';
import { Droplet, ChevronDown } from 'lucide-react';
import { Input } from '../../../components/input';
import { Slider } from '../../../components/Slider';

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
    <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-700 flex items-center">
          <Droplet size={15} className="mr-1.5 text-indigo-500" />
          Color Editor
        </h2>
        
        <button
          onClick={() => setShowEditorsPanel(!showEditorsPanel)}
          className="text-xs flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronDown size={14} className={`mr-1 transform ${showEditorsPanel ? '' : 'rotate-180'}`} />
          {showEditorsPanel ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {showEditorsPanel && (
        <div className="space-y-4 fade-in">
          <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
            <Input
              type="color"
              value={hexCode}
              onChange={handleColorPicker}
              className="w-full h-12 cursor-pointer border-0 rounded-lg p-1"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></div>
                Red
              </label>
              <span className="text-sm font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">
                {red}
              </span>
            </div>
            <Slider
              min={0}
              max={255}
              value={[red]}
              onValueChange={(value) => setRed(value[0])}
              className="w-full"
              variant="red"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></div>
                Green
              </label>
              <span className="text-sm font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded">
                {green}
              </span>
            </div>
            <Slider
              min={0}
              max={255}
              value={[green]}
              onValueChange={(value) => setGreen(value[0])}
              className="w-full"
              variant="green"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>
                Blue
              </label>
              <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {blue}
              </span>
            </div>
            <Slider
              min={0}
              max={255}
              value={[blue]}
              onValueChange={(value) => setBlue(value[0])}
              className="w-full"
              variant="blue"
            />
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Droplet size={14} className="mr-1.5 text-gray-500" />
                Opacity
              </label>
              <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {(alpha * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[alpha]}
              onValueChange={(value) => setAlpha(parseFloat(value[0].toFixed(2)))}
              className="w-full"
              variant="alpha"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorEditor;