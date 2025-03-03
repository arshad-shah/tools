import React from 'react';
import { Sparkles } from 'lucide-react';
import { ColorHarmony } from '../../../types/ColorTesterTypes';

interface HarmonyTabProps {
  colorHarmony: ColorHarmony | null;
  loadHarmonyColor: (rgb: string) => void;
}

const HarmonyTab: React.FC<HarmonyTabProps> = ({
  colorHarmony,
  loadHarmonyColor
}) => {
  if (!colorHarmony) {
    return <div>Loading harmony colors...</div>;
  }

  return (
    <div className="fade-in">
      <div className="flex items-center mb-4">
        <Sparkles size={16} className="mr-1.5 text-indigo-500" />
        <h2 className="text-sm font-medium text-gray-700">Harmonious Colors</h2>
        <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
          Color Theory
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(colorHarmony).map(([key, color]) => (
          <button
            key={key}
            className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex items-center space-x-3 hover:border-indigo-200 hover:shadow transition-all duration-200 group"
            onClick={() => loadHarmonyColor(color.rgb)}
          >
            <div 
              className="w-10 h-10 rounded-lg shadow-inner group-hover:scale-110 transition-transform duration-200"
              style={{ backgroundColor: color.rgb }}
            ></div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{color.name}</div>
              <div className="text-xs font-mono text-gray-500">{color.hex}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HarmonyTab;