import React from 'react';
import { Heart, Sparkles, BrainCircuit, Lightbulb, PaintBucket } from 'lucide-react';

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
  // Split the mood string into an array of traits
  const traits = colorMood.split(',').map(trait => trait.trim());
  
  // Group traits into primary and secondary
  const primaryTraits = traits.slice(0, 2);
  const secondaryTraits = traits.slice(2);
  
  // Generate sample use cases based on mood
  const generateUseCases = (mood: string): string[] => {
    const useCases: string[] = [];
    
    if (mood.includes('energetic') || mood.includes('passionate')) {
      useCases.push('Call-to-action buttons');
      useCases.push('Sports and fitness branding');
    }
    
    if (mood.includes('calm') || mood.includes('trust')) {
      useCases.push('Financial or healthcare interfaces');
      useCases.push('Meditation or wellness apps');
    }
    
    if (mood.includes('natural') || mood.includes('fresh')) {
      useCases.push('Eco-friendly or organic products');
      useCases.push('Outdoor or environmental brands');
    }
    
    if (mood.includes('creative') || mood.includes('luxury')) {
      useCases.push('Fashion or beauty products');
      useCases.push('Creative agencies or portfolios');
    }
    
    // Add some general use cases if we don't have enough specific ones
    if (useCases.length < 3) {
      useCases.push('Website accents and highlights');
      useCases.push('Branded content or marketing materials');
    }
    
    return useCases.slice(0, 4); // Return max 4 use cases
  };
  
  const useCases = generateUseCases(colorMood);

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-2">
        <Heart size={18} className="mr-2 text-indigo-500" />
        <h2 className="text-xl font-medium text-gray-800">Color Psychology</h2>
        <span className="ml-auto px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">
          Emotional Impact
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Color Name Card */}
        <div className="md:col-span-1 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <PaintBucket size={16} className="mr-2 text-indigo-500" />
              Color Identity
            </h3>
          </div>
          
          <div className="p-5 flex flex-col items-center">
            <div 
              className="w-24 h-24 rounded-2xl shadow-md mb-4 border border-gray-200"
              style={{ backgroundColor: rgbString }}
            ></div>
            
            <span className="text-lg font-semibold text-center text-gray-800">
              {colorNameSuggestion}
            </span>
            
            <div className="w-full mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i}
                    className="w-full aspect-square rounded-md"
                    style={{ 
                      backgroundColor: rgbString,
                      opacity: 0.2 + (i * 0.2)
                    }}
                  ></div>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>20%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Emotional Traits Card */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <BrainCircuit size={16} className="mr-2 text-indigo-500" />
              Emotional Associations
            </h3>
          </div>
          
          <div className="p-5">
            {/* Primary Emotions */}
            <div className="mb-4">
              <h4 className="text-xs uppercase text-gray-500 mb-2">Primary Emotional Response</h4>
              <div className="flex flex-wrap gap-2">
                {primaryTraits.map((trait, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 font-medium flex items-center"
                  >
                    <Sparkles size={14} className="mr-1.5" />
                    {trait}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Secondary Emotions */}
            <div className="mb-4">
              <h4 className="text-xs uppercase text-gray-500 mb-2">Secondary Emotional Qualities</h4>
              <div className="flex flex-wrap gap-2">
                {secondaryTraits.map((trait, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Use Cases */}
            <div className="mt-6">
              <h4 className="text-xs uppercase text-gray-500 mb-2 flex items-center">
                <Lightbulb size={14} className="mr-1.5 text-amber-500" />
                Suggested Use Cases
              </h4>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {useCases.map((useCase, index) => (
                  <div 
                    key={index}
                    className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100"
                  >
                    {useCase}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Color Psychology Info */}
      <div className="p-4 bg-gradient-to-r from-pink-50 to-indigo-50 rounded-xl border border-pink-100">
        <p className="text-sm text-gray-700">
          <span className="font-medium text-indigo-700">About color psychology: </span>
          Colors can evoke specific emotions and psychological responses. These associations can be influenced by 
          cultural context, personal experiences, and natural associations. Using colors strategically in design 
          can help communicate the right message and evoke desired emotional responses.
        </p>
      </div>
    </div>
  );
};

export default PsychologyTab;