// components/SchemaEditor.tsx
import React from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
import FieldEditorCard from './FieldEditorCard';
import { Card, CardContent, CardHeader, CardTitle } from './uiComponents';
import { FieldSchema } from '../../../types/RandomDataGeneratorTypes';

interface SchemaEditorProps {
  schema: FieldSchema[];
  count: number;
  expandedFields: {[key: string]: boolean};
  onCountChange: (count: number) => void;
  onAddField: (parentPath?: string) => void;
  onRemoveField: (path: string) => void;
  onUpdateField: (path: string, updatedField: Partial<FieldSchema>) => void;
  onMoveField: (path: string, direction: 'up' | 'down') => void;
  onToggleExpanded: (path: string) => void;
  onGenerateData: () => void;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({
  schema,
  count,
  expandedFields,
  onCountChange,
  onAddField,
  onRemoveField,
  onUpdateField,
  onMoveField,
  onToggleExpanded,
  onGenerateData
}) => {
  return (
    <Card className="w-full md:w-1/2">
      <CardHeader>
        <CardTitle>Schema Definition</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
          {schema.map((field, index) => (
            <FieldEditorCard 
              key={index} 
              field={field} 
              path={field.name} 
              index={index}
              parentPath=""
              level={0}
              expandedFields={expandedFields}
              onRemoveField={onRemoveField}
              onUpdateField={onUpdateField}
              onMoveField={onMoveField}
              onToggleExpanded={onToggleExpanded}
              onAddField={onAddField}
              totalFields={schema.length}
            />
          ))}
          
          <button
            onClick={() => onAddField()}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-rose-600 hover:border-rose-400 transition-all hover:shadow-md flex items-center justify-center gap-2 mt-4"
          >
            <PlusCircle size={20} />
            <span className="font-medium">Add New Field</span>
          </button>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <label htmlFor="count" className="text-sm font-medium text-gray-700">
              Number of items to generate:
            </label>
            <input
              type="number"
              id="count"
              value={count}
              onChange={(e) => onCountChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring focus:ring-rose-500 focus:ring-opacity-50 w-24"
              min="1"
            />
          </div>
          
          <button
            onClick={onGenerateData}
            className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-medium rounded-lg shadow hover:from-rose-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            <span>Generate Random Data</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchemaEditor;