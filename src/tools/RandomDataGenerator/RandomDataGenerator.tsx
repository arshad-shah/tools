// RandomDataGenerator.tsx - Main component
import React, { useState } from 'react';
import SchemaEditor from './components/SchemaEditor';
import DataPreview from './components/DataPreview';
import * as DataUtils from './utils';
import { FieldSchema, GeneratedDataItem } from '../../types/RandomDataGeneratorTypes';

const RandomDataGenerator: React.FC = () => {
  const [schema, setSchema] = useState<FieldSchema[]>(DataUtils.defaultSchema);
  const [count, setCount] = useState<number>(5);
  const [generatedData, setGeneratedData] = useState<GeneratedDataItem[] | null>(null);
  const [showJson, setShowJson] = useState<boolean>(false);
  const [expandedFields, setExpandedFields] = useState<{[key: string]: boolean}>({
    'address': true
  });

  console.log('schema', schema);
  console.log('generatedData', generatedData);
  

  // Toggle expanded state of object fields
  const toggleExpanded = (path: string): void => {
    setExpandedFields({
      ...expandedFields,
      [path]: !expandedFields[path]
    });
  };

  // Schema modification handlers
  const handleAddField = (parentPath: string = ''): void => {
    setSchema(DataUtils.addField(schema, parentPath));
  };

  const handleRemoveField = (path: string): void => {
    setSchema(DataUtils.removeField(schema, path));
  };

  const handleUpdateField = (path: string, updatedField: Partial<FieldSchema>): void => {
    console.log('Updating field at path:', path, 'with data:', updatedField);
    
    setSchema(DataUtils.updateField(schema, path, updatedField));
  };

  const handleMoveField = (path: string, direction: 'up' | 'down'): void => {
    setSchema(DataUtils.moveField(schema, path, direction));
  };

  // Data generation
  const handleGenerateData = (): void => {
    setGeneratedData(DataUtils.generateData(schema, count));
  };

  // Download JSON
  const handleDownloadJSON = (): void => {
    if (!generatedData) return;
    DataUtils.downloadJson(generatedData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">      
      <div className="flex flex-col md:flex-row flex-1 p-1 gap-6">
        <SchemaEditor
          schema={schema}
          count={count}
          expandedFields={expandedFields}
          onCountChange={setCount}
          onAddField={handleAddField}
          onRemoveField={handleRemoveField}
          onUpdateField={handleUpdateField}
          onMoveField={handleMoveField}
          onToggleExpanded={toggleExpanded}
          onGenerateData={handleGenerateData}
        />
        
        <DataPreview
          generatedData={generatedData}
          showJson={showJson}
          onToggleView={() => setShowJson(!showJson)}
          onDownloadJson={handleDownloadJSON}
        />
      </div>
    </div>
  );
};

export default RandomDataGenerator;