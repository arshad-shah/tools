import React from 'react';
import { X } from 'lucide-react';
import { HeaderInputProps } from '../../../types/ApiTesterTypes';

export const HeaderInput: React.FC<HeaderInputProps> = ({ header, index, onChange, onRemove }) => {
  return (
    <div className="flex items-center space-x-2 mb-2">
      <input
        value={header.key}
        onChange={(e) => onChange(index, 'key', e.target.value)}
        placeholder="Header name"
        className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
        list="common-headers"
      />
      <input
        value={header.value}
        onChange={(e) => onChange(index, 'value', e.target.value)}
        placeholder="Value"
        className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
      />
      <button 
        onClick={() => onRemove(index)} 
        className="text-gray-400 hover:text-red-500"
        aria-label="Remove header"
      >
        <X className="h-4 w-4" />
      </button>
      
      {/* Datalist for common headers suggestion - enhanced feature */}
      <datalist id="common-headers">
        <option value="Accept" />
        <option value="Accept-Encoding" />
        <option value="Authorization" />
        <option value="Cache-Control" />
        <option value="Content-Type" />
        <option value="Content-Length" />
        <option value="Cookie" />
        <option value="Host" />
        <option value="Origin" />
        <option value="Referer" />
        <option value="User-Agent" />
        <option value="X-API-Key" />
        <option value="X-Requested-With" />
      </datalist>
    </div>
  );
};