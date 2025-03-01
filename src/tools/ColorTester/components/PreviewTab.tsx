import React from 'react';
import { Eye } from 'lucide-react';

interface PreviewTabProps {
  rgbString: string;
  textColor: string;
}

const PreviewTab: React.FC<PreviewTabProps> = ({ 
  rgbString, 
  textColor 
}) => {
  return (
    <div className="fade-in">
      <div className="flex items-center mb-4">
        <Eye size={16} className="mr-1.5 text-indigo-500" />
        <h2 className="text-sm font-medium text-gray-700">Text Preview</h2>
        <span className="ml-2 bg-cyan-100 text-cyan-800 text-xs px-2 py-0.5 rounded-full">
          Visual Test
        </span>
      </div>
      
      <div className="rounded-lg p-6 shadow-sm flex flex-col items-center justify-center space-y-4"
        style={{ backgroundColor: rgbString }}>
        <div>
          <h3 style={{ color: textColor }} className="font-bold text-2xl mb-1 text-center">Heading Text</h3>
          <p style={{ color: textColor }} className="text-base mb-2 text-center">
            This is a subheading that explains the main content
          </p>
          <p style={{ color: textColor }} className="text-sm mb-4 text-center max-w-lg">
            This is how your text will appear on this background color. Good contrast ensures proper readability for your users. This paragraph demonstrates typical body text.
          </p>
          
          <div className="flex justify-center space-x-3">
            <button 
              className="px-4 py-1.5 rounded-lg text-sm font-medium"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                color: textColor, 
                border: `1px solid rgba(${textColor === '#ffffff' ? '255, 255, 255' : '0, 0, 0'}, 0.1)` 
              }}
            >
              Primary Button
            </button>
            <button 
              className="px-4 py-1.5 rounded-lg text-sm font-medium border"
              style={{ 
                color: textColor, 
                borderColor: `rgba(${textColor === '#ffffff' ? '255, 255, 255' : '0, 0, 0'}, 0.2)` 
              }}
            >
              Secondary Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewTab;