/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface DataNodeProps {
  name: string;
  data: any; // We could make this more specific based on usage
  depth: number;
  onToggle: () => void;
  isExpanded: boolean;
  isMatched: boolean;
}

const DataNode: React.FC<DataNodeProps> = React.memo(({ 
  name, 
  data, 
  depth, 
  onToggle, 
  isExpanded, 
  isMatched 
}) => {
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  
  const getTypeStyle = (): string => {
    if (isArray) return 'border-l-purple-500';
    if (isObject) return 'border-l-blue-500';
    if (typeof data === 'string') return 'border-l-green-500';
    if (typeof data === 'number') return 'border-l-yellow-500';
    return 'border-l-gray-500';
  };

  const getValue = (): string => {
    if (data === null) return 'null';
    if (typeof data === 'string') return `"${data}"`;
    if (typeof data !== 'object') return String(data);
    if (isArray) return `Array(${data.length})`;
    return `Object(${Object.keys(data).length})`;
  };

  return (
    <div 
      className={`
        border-l-4 ${getTypeStyle()}
        ${isMatched ? 'bg-yellow-50' : 'hover:bg-gray-50'} 
        transition-colors
      `}
      style={{ marginLeft: `${depth * 20}px` }}
    >
      <div className="flex items-center py-2 px-3">
        {isObject && (
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-200 rounded mr-2"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        <span className="font-mono text-sm">
          {name}
          <span className="text-gray-500 ml-2">{getValue()}</span>
        </span>
      </div>
    </div>
  );
});

DataNode.displayName = 'DataNode';

export default DataNode;