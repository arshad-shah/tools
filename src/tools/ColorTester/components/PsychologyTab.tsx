import React from 'react';
import { Heart, Star } from 'lucide-react';

interface PsychologyTabProps {
  rgbString: string;
  colorNameSuggestion: string;
  colorMood: string;
}

const PsychologyTab: React.FC<PsychologyTabProps> = ({
  rgbString,
  colorNameSuggestion,
  colorMood
}) => {
  return (
    <div className="fade-in">
      <div className="flex items-center mb-4">
        <Heart size={16} className="mr-1.5 text-indigo-500" />
        <h2 className="text-sm font-medium text-gray-700">Color Psychology</h2>
        <span className="ml-2 bg-pink-100 text-pink-800 text-xs px-2 py-0.5 rounded-full">
          Emotional Impact
        </span>
      </div>
      
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 shadow-sm border border-gray-100">
        <div className="flex items-start space-x-4">
          <div 
            className="w-16 h-16 rounded-lg shadow-inner flex-shrink-0"
            style={{ backgroundColor: rgbString }}
          ></div>
          <div className="flex-1">
            <h3 className="font-medium text-base flex items-center">
              {colorNameSuggestion}
              <Star size={14} className="ml-1.5 text-amber-400" />
            </h3>
            <p className="text-sm text-gray-600 mt-1 mb-3">{colorMood}</p>
            
            <div className="flex flex-wrap gap-1.5">
              {colorMood.split(',').map((trait, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700"
                >
                  {trait.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PsychologyTab;