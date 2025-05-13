import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { DataViewer } from './components/DataViewer';
import { ParsedData } from '../../types/CsvTsvTypes';

const CSVTSVViewer: React.FC = () => {
  const [parsedData, setParsedData] = useState<ParsedData[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [showUploader, setShowUploader] = useState<boolean>(true);
  
  // Handle successful data parsing
  const handleDataParsed = (
    data: ParsedData[], 
    cols: string[], 
    name: string
  ): void => {
    setParsedData(data);
    setColumns(cols);
    setFileName(name);
    setShowUploader(false);
  };
  
  // Reset application state
  const handleReset = (): void => {
    setParsedData(null);
    setColumns([]);
    setFileName('');
    setShowUploader(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
        
        {parsedData && (
                <div className="py-4 px-6 flex justify-between items-center shadow-md bg-white fixed top-0 left-0 right-0 z-10">
          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-lime-100 text-lime-800">
              {fileName}
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {parsedData.length} rows
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {columns.length} columns
            </div>
          </div>
                </div>
        )}

      <div className="pt-20 pb-6 px-6">
        {showUploader ? (
          <FileUploader onDataParsed={handleDataParsed} />
        ) : (
          <DataViewer
            data={parsedData!}
            columns={columns}
            fileName={fileName}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default CSVTSVViewer;