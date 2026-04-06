import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, Info, XCircle, BadgeCheck } from 'lucide-react';

interface AccessibilityTabProps {
  rgbString: string;
  contrastRatios: {
    white: number;
    black: number;
  };
}

// Helper function to get accessibility level based on contrast ratio
const getAccessibilityLevel = (ratio: number): { 
  level: string;
  color: string;
  passes: boolean;
  icon: React.ReactNode;
  description: string;
} => {
  if (ratio >= 7) {
    return { 
      level: 'AAA', 
      color: 'text-green-600 bg-green-100', 
      passes: true,
      icon: <BadgeCheck className="h-4 w-4 text-green-600" />,
      description: 'Excellent - Passes the highest level of WCAG standards'
    };
  } else if (ratio >= 4.5) {
    return { 
      level: 'AA', 
      color: 'text-blue-600 bg-blue-100', 
      passes: true,
      icon: <CheckCircle className="h-4 w-4 text-blue-600" />,
      description: 'Good - Passes standard WCAG requirements'
    };
  } else if (ratio >= 3) {
    return { 
      level: 'AA Large', 
      color: 'text-amber-600 bg-amber-100', 
      passes: true,
      icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      description: 'Limited - Only suitable for large text (18pt or 14pt bold)'
    };
  } else {
    return { 
      level: 'Fails', 
      color: 'text-red-600 bg-red-100', 
      passes: false,
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      description: 'Poor - Does not meet accessibility guidelines'
    };
  }
};

const AccessibilityTab: React.FC<AccessibilityTabProps> = ({
  rgbString,
  contrastRatios
}) => {
  const whiteTextLevel = getAccessibilityLevel(contrastRatios.white);
  const blackTextLevel = getAccessibilityLevel(contrastRatios.black);
  
  // Calculate overall accessibility score (0-100)
  const overallScore = Math.round(
    ((Math.min(contrastRatios.white, 7) + Math.min(contrastRatios.black, 7)) / 14) * 100
  );
  
  // Get text recommendation
  const getTextRecommendation = (): string => {
    if (contrastRatios.white >= 4.5 && contrastRatios.black < 4.5) {
      return "Use white text on this background for better accessibility.";
    } else if (contrastRatios.black >= 4.5 && contrastRatios.white < 4.5) {
      return "Use black text on this background for better accessibility.";
    } else if (contrastRatios.white >= 4.5 && contrastRatios.black >= 4.5) {
      return "Both white and black text are accessible on this background.";
    } else {
      return "Consider adjusting this color to improve text contrast for accessibility.";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-2">
        <ShieldCheck size={18} className="mr-2 text-indigo-500" />
        <h2 className="text-xl font-medium text-gray-800">Accessibility Check</h2>
        <span className="ml-auto px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
          WCAG Standards
        </span>
      </div>
      
      {/* Accessibility Score Card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-700">Overall Accessibility Score</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium 
              ${overallScore >= 80 ? 'bg-green-100 text-green-700' : 
                overallScore >= 50 ? 'bg-amber-100 text-amber-700' : 
                'bg-red-100 text-red-700'}`}
            >
              {overallScore}%
            </div>
          </div>
          
          <div className="mt-4 w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                overallScore >= 80 ? 'bg-green-500' : 
                overallScore >= 50 ? 'bg-amber-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${overallScore}%` }}
            ></div>
          </div>
          
          <p className="mt-3 text-sm text-gray-600">{getTextRecommendation()}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
          {/* White Text Test */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded-full mr-2"></div>
              White Text Contrast
            </h4>
            
            <div className="h-32 rounded-xl overflow-hidden shadow-sm relative">
              <div style={{ backgroundColor: rgbString }} className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-white text-lg font-semibold mb-1">WCAG Sample Text</span>
                <span className="text-white text-sm">Normal paragraph text example</span>
              </div>
              
              <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${whiteTextLevel.color}`}>
                  {whiteTextLevel.level}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 flex items-start">
              {whiteTextLevel.icon}
              <div className="ml-2">
                <p className="text-sm font-medium">{contrastRatios.white.toFixed(2)}:1 Contrast Ratio</p>
                <p className="text-xs text-gray-600">{whiteTextLevel.description}</p>
              </div>
            </div>
          </div>
          
          {/* Black Text Test */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <div className="w-4 h-4 bg-black rounded-full mr-2"></div>
              Black Text Contrast
            </h4>
            
            <div className="h-32 rounded-xl overflow-hidden shadow-sm relative">
              <div style={{ backgroundColor: rgbString }} className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-black text-lg font-semibold mb-1">WCAG Sample Text</span>
                <span className="text-black text-sm">Normal paragraph text example</span>
              </div>
              
              <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${blackTextLevel.color}`}>
                  {blackTextLevel.level}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 flex items-start">
              {blackTextLevel.icon}
              <div className="ml-2">
                <p className="text-sm font-medium">{contrastRatios.black.toFixed(2)}:1 Contrast Ratio</p>
                <p className="text-xs text-gray-600">{blackTextLevel.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* WCAG Guidelines Info */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Info size={16} className="mr-2 text-indigo-500" />
            WCAG Compliance Guidelines
          </h3>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center mb-2">
                <BadgeCheck size={16} className="text-blue-600 mr-1.5" />
                <h4 className="text-sm font-medium text-blue-800">AA Standard</h4>
              </div>
              <p className="text-xs text-blue-700">Minimum 4.5:1 contrast ratio for normal text (under 18pt)</p>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <div className="flex items-center mb-2">
                <BadgeCheck size={16} className="text-green-600 mr-1.5" />
                <h4 className="text-sm font-medium text-green-800">AAA Standard</h4>
              </div>
              <p className="text-xs text-green-700">Enhanced 7:1 contrast ratio for normal text (under 18pt)</p>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <div className="flex items-center mb-2">
                <BadgeCheck size={16} className="text-amber-600 mr-1.5" />
                <h4 className="text-sm font-medium text-amber-800">Large Text</h4>
              </div>
              <p className="text-xs text-amber-700">Only needs 3:1 for large text (18pt+ or 14pt+ bold)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityTab;