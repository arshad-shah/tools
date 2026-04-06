// components/FieldEditorCard.tsx
import React from 'react';
import { Trash2, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Check } from 'lucide-react';
import * as DataUtils from '../utils';
import { FieldSchema } from '../../../types/RandomDataGeneratorTypes';

interface FieldEditorCardProps {
  field: FieldSchema;
  path: string;
  index: number;
  parentPath: string;
  level: number;
  expandedFields: {[key: string]: boolean};
  totalFields: number;
  onRemoveField: (path: string) => void;
  onUpdateField: (path: string, updatedField: Partial<FieldSchema>) => void;
  onMoveField: (path: string, direction: 'up' | 'down') => void;
  onToggleExpanded: (path: string) => void;
  onAddField: (parentPath?: string) => void;
}

const FieldEditorCard: React.FC<FieldEditorCardProps> = ({
  field,
  path,
  index,
  parentPath,
  level,
  expandedFields,
  totalFields,
  onRemoveField,
  onUpdateField,
  onMoveField,
  onToggleExpanded,
  onAddField
}) => {
  const isObject = field.type === 'object';
  const isArray = field.type === 'array';
  const isNested = isObject || isArray;
  // Ensure correct path construction for all fields, especially nested ones
  const fullPath = parentPath ? `${parentPath}.${index}` : `${index}`;
  const isExpanded = expandedFields[path] || false;
  
  return (
    <div 
      className={`p-5 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${level > 0 ? 'mt-4' : ''}`}
      style={{ marginLeft: level > 0 ? `${level * 1}rem` : 0 }}
    >
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          {isNested && (
            <button
              onClick={() => onToggleExpanded(path)}
              className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
              aria-label={isExpanded ? "Collapse field" : "Expand field"}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          
          <div className="h-6 w-6 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
            {index + 1}
          </div>
          
          <input
            type="text"
            value={field.name}
            onChange={(e) => onUpdateField(fullPath, { name: e.target.value })}
            className="border-0 bg-transparent font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-2 py-1 text-lg"
            placeholder="Field name"
            aria-label="Field name"
          />
        </div>
        
        <div className="flex items-center space-x-1">
          {level === 0 && (
            <>
              <button
                onClick={() => onMoveField(`${index}`, 'up')}
                disabled={index === 0}
                className={`p-2 rounded-full ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'} transition-colors`}
                title="Move up"
                aria-label="Move field up"
              >
                <ArrowUp size={16} />
              </button>
              
              <button
                onClick={() => onMoveField(`${index}`, 'down')}
                disabled={index === totalFields - 1}
                className={`p-2 rounded-full ${index === totalFields - 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'} transition-colors`}
                title="Move down"
                aria-label="Move field down"
              >
                <ArrowDown size={16} />
              </button>
            </>
          )}
          
          <button
            onClick={() => onRemoveField(fullPath)}
            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove field"
            aria-label="Remove field"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Data Type</label>
          <select
            value={field.type}
            onChange={(e) => onUpdateField(fullPath, { type: e.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 py-2"
            aria-label="Data type"
          >
            {DataUtils.fieldTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        
        {field.type === 'number' && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-2">Min Value</label>
              <input
                type="number"
                value={field.min || 0}
                onChange={(e) => onUpdateField(fullPath, { min: parseInt(e.target.value) })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 py-2"
                aria-label="Minimum value"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-2">Max Value</label>
              <input
                type="number"
                value={field.max || 100}
                onChange={(e) => onUpdateField(fullPath, { max: parseInt(e.target.value) })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 py-2"
                aria-label="Maximum value"
              />
            </div>
          </div>
        )}
        
        {field.type === 'array' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Array Size</label>
            <input
              type="number"
              value={field.arraySize || 3}
              onChange={(e) => onUpdateField(fullPath, { arraySize: parseInt(e.target.value) })}
              min="1"
              max="20"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 py-2"
              aria-label="Array size"
            />
          </div>
        )}
        
        <div className="flex items-center">
          <div className="bg-gray-50 p-3 rounded-lg flex items-center">
            <div className="relative">
              <input
                type="checkbox"
                id={`required-${path}`}
                checked={field.required || false}
                onChange={(e) => {
                  // For debugging
                  console.log(`Toggle required for field at path: ${fullPath}`);
                  onUpdateField(fullPath, { required: e.target.checked });
                }}
                className="sr-only" // Hide the default checkbox but keep it accessible
                aria-label="Required field"
              />
              <div 
                className={`h-5 w-5 rounded border ${field.required ? 'bg-rose-500 border-rose-500' : 'bg-white border-gray-300'} flex items-center justify-center transition-colors cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event bubbling
                  onUpdateField(fullPath, { required: !field.required });
                }}
              >
                {field.required && <Check size={12} className="text-white" />}
              </div>
            </div>
            <label 
              htmlFor={`required-${path}`} 
              className="ml-2 text-sm text-gray-700 font-medium cursor-pointer"
              onClick={() => {
                onUpdateField(fullPath, { required: !field.required });
              }}
            >
              Required Field
            </label>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-2 text-xs text-gray-500 italic">
        {DataUtils.fieldDescriptions[field.type] || "Field type description not available"}
      </div>
      
      {isNested && isExpanded && (
        <div className="mt-4 pl-4 border-l-2 border-rose-100">
          {field.fields && field.fields.map((nestedField, nestedIndex) => (
            <FieldEditorCard
              key={`${path}.${nestedField.name}`}
              field={nestedField}
              path={`${path}.${nestedField.name}`}
              index={nestedIndex}
              parentPath={`${fullPath}.fields`}
              level={level + 1}
              expandedFields={expandedFields}
              totalFields={field.fields?.length ?? 0}
              onRemoveField={onRemoveField}
              onUpdateField={onUpdateField}
              onMoveField={onMoveField}
              onToggleExpanded={onToggleExpanded}
              onAddField={onAddField}
            />
          ))}
          
          <button
            onClick={() => onAddField(path)}
            className="w-full mt-4 py-2 px-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-rose-600 hover:border-rose-300 transition-all flex items-center justify-center gap-2"
            aria-label={`Add field to ${field.name}`}
          >
            <Plus size={16} />
            <span className="font-medium">Add Field to {field.name}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FieldEditorCard;