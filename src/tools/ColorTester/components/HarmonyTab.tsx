import React from 'react';
import { Sparkles, Palette, ArrowRight } from 'lucide-react';
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <Sparkles size={24} className="text-indigo-400 mb-2" />
          <p className="text-gray-500">Calculating harmony colors...</p>
        </div>
      </div>
    );
  }

  const harmonyGroups = [
    {
      title: "Complementary",
      description: "Colors opposite each other on the color wheel",
      items: [colorHarmony.complementary]
    },
    {
      title: "Analogous",
      description: "Colors adjacent to each other on the color wheel",
      items: [colorHarmony.analogous1, colorHarmony.analogous2]
    },
    {
      title: "Triadic",
      description: "Three colors evenly spaced around the color wheel",
      items: [colorHarmony.triadic1, colorHarmony.triadic2]
    },
    {
      title: "Shades",
      description: "Lighter and darker variations of the same color",
      items: [colorHarmony.lighter, colorHarmony.darker]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-2">
        <Sparkles size={18} className="mr-2 text-indigo-500" />
        <h2 className="text-xl font-medium text-gray-800">Color Harmony</h2>
        <span className="ml-auto px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
          Color Theory
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {harmonyGroups.map((group, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
              <h3 className="text-sm font-medium text-indigo-700">{group.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
            </div>
            
            <div className="p-4 space-y-3">
              {group.items.map((color, colorIndex) => (
                <button
                  key={colorIndex}
                  className="w-full flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 group"
                  onClick={() => loadHarmonyColor(color.rgb)}
                >
                  <div 
                    className="w-12 h-12 rounded-lg shadow-inner mr-3 group-hover:scale-105 transition-transform duration-200 border border-gray-200"
                    style={{ backgroundColor: color.rgb }}
                  ></div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                        {color.name}
                      </span>
                      <ArrowRight size={14} className="ml-1.5 opacity-0 group-hover:opacity-100 text-indigo-400 transition-all" />
                    </div>
                    <div className="text-xs font-mono text-gray-500 mt-0.5">{color.hex}</div>
                  </div>
                  
                  <div className="ml-auto transform scale-0 group-hover:scale-100 transition-transform origin-center p-1 bg-indigo-100 rounded-full">
                    <Palette size={16} className="text-indigo-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
        <p className="text-sm text-indigo-700">
          <span className="font-medium">Pro tip:</span> Click on any color to load it as your active color. 
          These harmony relationships follow established color theory principles and create pleasing combinations.
        </p>
      </div>
    </div>
  );
};

export default HarmonyTab;