import React from 'react';
import { Clipboard, Copy, Check } from 'lucide-react';

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
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-700 flex items-center">
          <Clipboard size={15} className="mr-1.5 text-indigo-500" />
          Color Values
        </h2>
        
        {copiedValue && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse shadow-sm">
            <Check size={12} className="mr-1" />
            Copied!
          </span>
        )}
      </div>
      
      <div className="flex flex-col space-y-2">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-100 hover:border-indigo-200 transition-all duration-200 relative group flex items-center">
          <div className="w-1.5 h-full absolute left-0 top-0 bg-indigo-400 rounded-l-lg opacity-70"></div>
          <div className="pl-2 flex-1">
            <span className="text-xs font-medium text-indigo-500 block uppercase tracking-wide">HEX</span>
            <span className="font-mono text-gray-800 text-sm select-all">{hexCode}</span>
          </div>
          <button 
            onClick={() => copyToClipboard(hexCode, 'hex')}
            className="text-gray-400 hover:text-indigo-500 transition-colors p-1.5 rounded-full hover:bg-indigo-50"
            title="Copy HEX code"
          >
            {copiedValue === 'hex' ? 
              <Check size={18} className="text-green-500" /> : 
              <Copy size={18} className="opacity-80 group-hover:opacity-100" />}
          </button>
        </div>
        
        <div className="bg-white rounded-lg p-3 shadow-sm border border-green-100 hover:border-green-200 transition-all duration-200 relative group flex items-center">
          <div className="w-1.5 h-full absolute left-0 top-0 bg-green-400 rounded-l-lg opacity-70"></div>
          <div className="pl-2 flex-1">
            <span className="text-xs font-medium text-green-500 block uppercase tracking-wide">RGB</span>
            <span className="font-mono text-gray-800 text-sm select-all">{rgbString}</span>
          </div>
          <button 
            onClick={() => copyToClipboard(rgbString, 'rgb')}
            className="text-gray-400 hover:text-green-500 transition-colors p-1.5 rounded-full hover:bg-green-50"
            title="Copy RGB value"
          >
            {copiedValue === 'rgb' ? 
              <Check size={18} className="text-green-500" /> : 
              <Copy size={18} className="opacity-80 group-hover:opacity-100" />}
          </button>
        </div>
        
        <div className="bg-white rounded-lg p-3 shadow-sm border border-amber-100 hover:border-amber-200 transition-all duration-200 relative group flex items-center">
          <div className="w-1.5 h-full absolute left-0 top-0 bg-amber-400 rounded-l-lg opacity-70"></div>
          <div className="pl-2 flex-1">
            <span className="text-xs font-medium text-amber-500 block uppercase tracking-wide">CSS</span>
            <span className="font-mono text-gray-800 text-sm select-all">color: {rgbString};</span>
          </div>
          <button 
            onClick={() => copyToClipboard(`color: ${rgbString};`, 'css')}
            className="text-gray-400 hover:text-amber-500 transition-colors p-1.5 rounded-full hover:bg-amber-50"
            title="Copy CSS declaration"
          >
            {copiedValue === 'css' ? 
              <Check size={18} className="text-green-500" /> : 
              <Copy size={18} className="opacity-80 group-hover:opacity-100" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorValues;