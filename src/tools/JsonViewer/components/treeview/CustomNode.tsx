import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MainNode } from './types';
import { NodeStyles } from './styles';
import { cn } from '../../../../lib/utils';

const parseKeyValuePairs = (content: string) => {
  try {
    const pairs = content.split('\n')
      .filter(line => line.includes(':'))
      .reduce((acc, line) => {
        const [key, ...values] = line.split(':');
        const value = values.join(':').trim();
        return { ...acc, [key.trim()]: value };
      }, {});
    
    return Object.keys(pairs).length > 0 ? pairs : null;
  } catch {
    return null;
  }
};

const StyledKeyValuePairs = ({ keyValuePairs }: {
  keyValuePairs: Record<string, string>;
}) => {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-2 shadow-xl">
      <div className="space-y-2">
        {Object.entries(keyValuePairs).map(([key, value], index) => (
          <div 
            key={index} 
            className="group flex items-center justify-between p-2 space-x-6 rounded-lg transition-all duration-300 hover:bg-slate-700/50"
          >
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-emerald-300 transition-colors duration-300"></div>
              <span className="text-emerald-300 font-medium text-sm uppercase tracking-wide group-hover:text-emerald-200">
                {key}
              </span>
            </div>
            <span className="text-gray-200 font-light text-sm group-hover:text-white">
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};


const CustomNode: React.FC<NodeProps<MainNode>> = ({ data }) => {
  const isObject = data.type === 'object';
  const isPrimitive = data.type === 'primitive';
  const keyValuePairs = typeof data.content === 'string' ? parseKeyValuePairs(data.content) : null;

  const renderContent = () => {
    if (keyValuePairs) {
      return (
        <StyledKeyValuePairs keyValuePairs={keyValuePairs} />
      );
    }
    return (
      <div className={NodeStyles.content(isPrimitive)}>
        {data.content}
      </div>
    );
  };

  return (
    <div className={cn(
      NodeStyles.container(isPrimitive),
      "bg-gray-800 border border-gray-700 shadow-lg"
    )}>
      {!isPrimitive && (
        <div className="flex items-center gap-2 mb-2 px-2 py-2 bg-gray-700/50 rounded-t-lg">
          <div className={NodeStyles.indicator(isObject)} />
          <span className="font-medium text-gray-100">
            {data.label}
          </span>
        </div>
      )}
      <div className="p-2">
        {renderContent()}
      </div>
      <Handle 
        type="source" 
        position={Position.Right}
        className={NodeStyles.handle} 
      />
      <Handle 
        type="target" 
        position={Position.Left}
        className={NodeStyles.handle} 
      />
    </div>
  );
};

export default CustomNode;