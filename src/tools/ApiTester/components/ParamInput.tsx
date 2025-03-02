import React from 'react';
import { X } from 'lucide-react';
import { ParamInputProps } from '../../../types/ApiTesterTypes';

export const ParamInput: React.FC<ParamInputProps> = ({ param, index, onChange, onRemove }) => {
  return (
    <div className="flex items-center space-x-2 mb-2">
      <div className="flex-none w-8">
        <input
          type="checkbox"
          checked={param.enabled}
          onChange={(e) => onChange(index, 'enabled', e.target.checked)}
          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
          aria-label="Enable parameter"
        />
      </div>
      <input
        value={param.key}
        onChange={(e) => onChange(index, 'key', e.target.value)}
        placeholder="Parameter name"
        className={`flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 ${!param.enabled ? 'opacity-60' : ''}`}
      />
      <input
        value={param.value}
        onChange={(e) => onChange(index, 'value', e.target.value)}
        placeholder="Value"
        className={`flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 ${!param.enabled ? 'opacity-60' : ''}`}
        disabled={!param.enabled}
      />
      <button 
        onClick={() => onRemove(index)} 
        className="text-gray-400 hover:text-red-500"
        aria-label="Remove parameter"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};