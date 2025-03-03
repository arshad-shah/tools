import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { getAccessibilityLevel } from '../utils/CalculationUtils';

interface AccessibilityTabProps {
  rgbString: string;
  contrastRatios: {
    white: number;
    black: number;
  };
}

const AccessibilityTab: React.FC<AccessibilityTabProps> = ({
  rgbString,
  contrastRatios
}) => {
  return (
    <div className="fade-in">
      <div className="flex items-center mb-4">
        <ShieldCheck size={16} className="mr-1.5 text-indigo-500" />
        <h2 className="text-sm font-medium text-gray-700">Accessibility</h2>
        <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full">
          WCAG Standards
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
            <span className="w-3 h-3 bg-white border border-gray-300 rounded-full mr-2"></span>
            White Text
          </h3>
          <div className="rounded-lg overflow-hidden mb-3 shadow-sm">
            <div style={{ backgroundColor: rgbString }} className="p-4 flex flex-col items-center justify-center">
              <span className="text-white text-lg font-semibold mb-1">Heading</span>
              <span className="text-white text-sm">Normal text</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Contrast: {contrastRatios.white.toFixed(2)}:1</span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${getAccessibilityLevel(contrastRatios.white).color} bg-opacity-20 font-medium`}>
              {getAccessibilityLevel(contrastRatios.white).level}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {getAccessibilityLevel(contrastRatios.white).passes ? 
              "Passes accessibility requirements" : 
              "Does not meet accessibility standards"}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <h3 className="font-medium text-sm text-gray-700 mb-3 flex items-center">
            <span className="w-3 h-3 bg-black rounded-full mr-2"></span>
            Black Text
          </h3>
          <div className="rounded-lg overflow-hidden mb-3 shadow-sm">
            <div style={{ backgroundColor: rgbString }} className="p-4 flex flex-col items-center justify-center">
              <span className="text-black text-lg font-semibold mb-1">Heading</span>
              <span className="text-black text-sm">Normal text</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Contrast: {contrastRatios.black.toFixed(2)}:1</span>
            <span className={`text-xs px-2.5 py-1 rounded-full ${getAccessibilityLevel(contrastRatios.black).color} bg-opacity-20 font-medium`}>
              {getAccessibilityLevel(contrastRatios.black).level}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {getAccessibilityLevel(contrastRatios.black).passes ? 
              "Passes accessibility requirements" : 
              "Does not meet accessibility standards"}
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
        <div className="flex items-start">
          <Info size={16} className="text-indigo-500 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-xs text-indigo-700">
            <p className="font-medium mb-1">WCAG Compliance Guidelines:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>AA standard requires at least 4.5:1 for normal text</li>
              <li>AAA standard requires at least 7:1 for normal text</li>
              <li>Large text (18pt+) only needs 3:1 for AA standard</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityTab;