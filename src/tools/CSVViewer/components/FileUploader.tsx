import React, { useState } from 'react';
import Papa from 'papaparse';
import { FileParserProps, ParsedData } from '../../../types/CsvTsvTypes';

export const FileUploader: React.FC<FileParserProps> = ({ onDataParsed }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Process the uploaded file
  const processFile = (file: File): void => {
    setLoading(true);
    setError(null);
    
    try {
      // Detect file type based on extension
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const delimiter = extension === 'tsv' ? '\t' : ',';

      // Use FileReader to read the file content
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          // Parse the file
          parseFile(content, delimiter, file.name);
        }
        setLoading(false);
      };
      
      reader.onerror = () => {
        setError("Failed to read the file. Please try again.");
        setLoading(false);
      };
      
      reader.readAsText(file);
    } catch (err) {
      setError(`Error processing file: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };

  // Parse CSV/TSV content
  const parseFile = (content: string, delimiter: string, fileName: string): void => {
    Papa.parse<ParsedData>(content, {
      delimiter: delimiter,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Parsing error: ${results.errors[0].message}`);
        } else {
          const cols = results.meta.fields || [];
          onDataParsed(results.data as ParsedData[], cols, fileName);
        }
        setLoading(false);
      },
      error: (error: Error) => {
        setError(`Parsing error: ${error.message}`);
        setLoading(false);
      }
    });
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };
  
  // Handle direct paste from clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>): void => {
    const clipboardData = e.clipboardData;
    const pastedText = clipboardData.getData('text');
    
    if (pastedText) {
      setLoading(true);
      setError(null);
      
      // Try to parse the pasted data
      parseFile(pastedText, ',', "Pasted Data");
    }
  };

  // Event handlers for dropzone
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  // File drop handler
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Load sample data
  const loadSampleData = (): void => {
    const sampleData = "Name,Age,City,Salary\nJohn,28,New York,75000\nSarah,32,San Francisco,92000\nMike,45,Chicago,68000\nEmma,37,Boston,83000\nDavid,29,Seattle,79000";
    parseFile(sampleData, ',', "Sample Data");
  };

  return (
    <div 
      className="border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center h-96 
        border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
      onDrop={handleFileDrop}
      onDragOver={handleDragOver}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <div className="mb-6 p-4 rounded-full bg-lime-100">
        <svg className="w-12 h-12 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2">Upload Your Data File</h2>
      <p className="mb-6 text-gray-500">
        Drag and drop your CSV or TSV file here, click to browse, or paste data
      </p>
      <label className="px-4 py-2 rounded-lg cursor-pointer font-medium bg-lime-500 hover:bg-lime-600 text-white">
        <span>Browse Files</span>
        <input type="file" accept=".csv,.tsv" onChange={handleFileUpload} className="hidden" />
      </label>
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-sm text-gray-400">
          Supports CSV and TSV file formats
        </p>
        <button 
          onClick={loadSampleData}
          className="px-3 py-1 text-xs rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
        >
          Load Sample Data
        </button>
      </div>
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {loading && <p className="mt-4 text-lime-600">Processing your file...</p>}
    </div>
  );
};