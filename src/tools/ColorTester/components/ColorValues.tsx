import React from 'react';
import { Clipboard, Copy, Check, ArrowRight } from 'lucide-react';

interface ColorValuesProps {
  hexCode: string;
  rgbString: string;
  copiedValue: string | null;
  copyToClipboard: (text: string, label: string) => void;
}

const ColorValues: React.FC<ColorValuesProps> = ({
  hexCode,
  rgbString,
  copiedValue,
  copyToClipboard
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 border border-indigo-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-800 flex items-center">
          <Clipboard size={18} className="mr-2 text-indigo-500" />
          Color Values
        </h2>
        
        {copiedValue && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse shadow-sm">
            <Check size={14} className="mr-1.5" />
            Copied!
          </span>
        )}
      </div>
      
      <div className="flex flex-col space-y-3">
        {/* HEX Value */}
        <div className="bg-indigo-50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 relative group flex items-center overflow-hidden">
          <div className="w-1 h-full absolute left-0 top-0 bg-indigo-500 rounded-l-lg"></div>
          <div className="pl-3 flex-1">
            <span className="text-xs font-semibold text-indigo-600 block uppercase tracking-wider mb-1">HEX</span>
            <div className="flex items-center">
              <span className="font-mono text-gray-800 text-sm select-all">{hexCode}</span>
              <ArrowRight size={14} className="mx-2 text-indigo-300" />
              <button 
                onClick={() => copyToClipboard(hexCode, 'hex')}
                className="text-indigo-500 hover:text-indigo-600 transition-colors p-1.5 rounded-full hover:bg-indigo-100"
                title="Copy HEX code"
              >
                {copiedValue === 'hex' ? 
                  <Check size={16} className="text-green-500" /> : 
                  <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* RGB Value */}
        <div className="bg-blue-50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 relative group flex items-center overflow-hidden">
          <div className="w-1 h-full absolute left-0 top-0 bg-blue-500 rounded-l-lg"></div>
          <div className="pl-3 flex-1">
            <span className="text-xs font-semibold text-blue-600 block uppercase tracking-wider mb-1">RGB</span>
            <div className="flex items-center">
              <span className="font-mono text-gray-800 text-sm select-all">{rgbString}</span>
              <ArrowRight size={14} className="mx-2 text-blue-300" />
              <button 
                onClick={() => copyToClipboard(rgbString, 'rgb')}
                className="text-blue-500 hover:text-blue-600 transition-colors p-1.5 rounded-full hover:bg-blue-100"
                title="Copy RGB value"
              >
                {copiedValue === 'rgb' ? 
                  <Check size={16} className="text-green-500" /> : 
                  <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
        
        {/* CSS Value */}
        <div className="bg-purple-50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 relative group flex items-center overflow-hidden">
          <div className="w-1 h-full absolute left-0 top-0 bg-purple-500 rounded-l-lg"></div>
          <div className="pl-3 flex-1">
            <span className="text-xs font-semibold text-purple-600 block uppercase tracking-wider mb-1">CSS</span>
            <div className="flex items-center">
              <span className="font-mono text-gray-800 text-sm select-all">color: {rgbString};</span>
              <ArrowRight size={14} className="mx-2 text-purple-300" />
              <button 
                onClick={() => copyToClipboard(`color: ${rgbString};`, 'css')}
                className="text-purple-500 hover:text-purple-600 transition-colors p-1.5 rounded-full hover:bg-purple-100"
                title="Copy CSS declaration"
              >
                {copiedValue === 'css' ? 
                  <Check size={16} className="text-green-500" /> : 
                  <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorValues;