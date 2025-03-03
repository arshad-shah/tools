import React, { useState } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// TypeScript interfaces
interface ParsedData {
  [key: string]: unknown;
}

interface Statistics {
  [column: string]: {
    min: number;
    max: number;
    avg: number;
    count: number;
    sum: number;
  };
}

interface ChartDataPoint {
  index: number;
  value: number;
}

const CSVTSVViewer: React.FC = () => {
  // State management
  const [, setFileData] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [fileType, setFileType] = useState<'csv' | 'tsv'>('csv');
  const [statistics, setStatistics] = useState<Statistics>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'data' | 'stats' | 'chart'>('data');
  const [chartColumn, setChartColumn] = useState<string>('');
  const [showDropzone, setShowDropzone] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>('');

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
      setFileName("Pasted Data");
      setFileType('csv');
      setFileData(pastedText);
      
      // Try to parse the pasted data
      parseFile(pastedText, ',');
      setShowDropzone(false);
    }
  };

  // Process the uploaded file
  const processFile = (file: File): void => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    
    try {
      // Detect file type based on extension
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      setFileType(extension === 'tsv' ? 'tsv' : 'csv');

      // Use FileReader to read the file content directly
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          setFileData(content);
          
          // Parse the file
          parseFile(content, extension === 'tsv' ? '\t' : ',');
          setShowDropzone(false);
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

  // File parsing function
  const parseFile = (content: string, delimiter: string): void => {
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
          setParsedData(results.data as ParsedData[]);
          setColumns(cols);
          setSelectedColumns(cols);
          calculateStatistics(results.data as ParsedData[], cols);
          
          // Set default chart column to first numeric column
          const numericColumn = cols.find(col => 
            results.data.length > 0 && 
            typeof (results.data[0] as ParsedData)[col] === 'number'
          );
          if (numericColumn) {
            setChartColumn(numericColumn);
          }
        }
        setLoading(false);
      },
      error: (error: Error) => {
        setError(`Parsing error: ${error.message}`);
        setLoading(false);
      }
    });
  };

  // Calculate statistics for numeric columns
  const calculateStatistics = (data: ParsedData[], cols: string[]): void => {
    const stats: Statistics = {};
    
    cols.forEach(col => {
      // Check if column contains numeric data
      const numericValues = data
        .map(row => row[col])
        .filter((val): val is number => typeof val === 'number' && !isNaN(val));
      
      if (numericValues.length > 0) {
        stats[col] = {
          min: _.min(numericValues) || 0,
          max: _.max(numericValues) || 0,
          avg: _.sum(numericValues) / numericValues.length,
          count: numericValues.length,
          sum: _.sum(numericValues)
        };
      }
    });
    
    setStatistics(stats);
  };

  // Data filtering
  const filteredData = React.useMemo((): ParsedData[] => {
    if (!parsedData) return [];
    
    let filtered = parsedData;
    
    // Apply column filter
    if (filterColumn && filterValue) {
      filtered = filtered.filter(row => {
        const cellValue = row[filterColumn];
        if (cellValue === null || cellValue === undefined) return false;
        
        return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    }
    
    // Apply sorting
    if (sortColumn) {
      filtered = _.orderBy(filtered, [sortColumn], [sortDirection]);
    }
    
    return filtered;
  }, [parsedData, filterColumn, filterValue, sortColumn, sortDirection]);

  // Pagination
  const paginatedData = React.useMemo((): ParsedData[] => {
    if (!filteredData) return [];
    
    const startIndex = (page - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  // Handle column selection
  const toggleColumnSelection = (column: string): void => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(col => col !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  // Handle sort change
  const handleSort = (column: string): void => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Export as CSV or TSV
  const exportData = (): void => {
    if (!parsedData) return;
    
    const dataToExport = filteredData.map(row => {
      const newRow: ParsedData = {};
      selectedColumns.forEach(col => {
        newRow[col] = row[col];
      });
      return newRow;
    });
    
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `exported_data.${fileType}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Prepare chart data
  const chartData = React.useMemo((): ChartDataPoint[] => {
    if (!parsedData || !chartColumn) return [];
    
    // Get the first 50 rows for the chart
    return filteredData.slice(0, 50).map((row, index) => ({
      index: index + 1,
      value: row[chartColumn] as number
    }));
  }, [filteredData, chartColumn]);

  // Get numeric columns for chart
  const numericColumns = React.useMemo((): string[] => {
    return Object.keys(statistics);
  }, [statistics]);

    // Reset and upload new file
  const resetViewer = (): void => {
    setShowDropzone(true);
    setParsedData(null);
    setFileData(null);
    setColumns([]);
    setSelectedColumns([]);
    setStatistics({});
    setFilterColumn('');
    setFilterValue('');
    setSortColumn('');
    setSortDirection('asc');
    setPage(1);
    setError(null);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      <div className={`fixed top-0 left-0 right-0 z-10 py-4 px-6 flex justify-between items-center shadow-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lime-500 to-green-600">
            DataVision
          </h1>
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200">
            CSV/TSV Analyzer
          </span>
        </div>
        
        {parsedData && (
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-lime-900 text-lime-200' : 'bg-lime-100 text-lime-800'}`}>
              {fileName}
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
              {parsedData.length} rows
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
              {columns.length} columns
            </div>
          </div>
        )}
        
        <div className="flex items-center">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="pt-20 pb-6 px-6">
        {showDropzone ? (
          <div 
            className={`border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center h-96 ${
              darkMode 
                ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-500' 
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
            }`}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onPaste={handlePaste}
            tabIndex={0}
          >
            <div className={`mb-6 p-4 rounded-full ${darkMode ? 'bg-lime-900' : 'bg-lime-100'}`}>
              <svg className={`w-12 h-12 ${darkMode ? 'text-lime-300' : 'text-lime-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Upload Your Data File</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Drag and drop your CSV or TSV file here, click to browse, or paste data
            </p>
            <label className={`px-4 py-2 rounded-lg cursor-pointer font-medium ${
              darkMode 
                ? 'bg-lime-600 hover:bg-lime-700 text-white' 
                : 'bg-lime-500 hover:bg-lime-600 text-white'
            }`}>
              <span>Browse Files</span>
              <input type="file" accept=".csv,.tsv" onChange={handleFileUpload} className="hidden" />
            </label>
            <div className="mt-4 flex flex-col gap-2">
              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Supports CSV and TSV file formats
              </p>
              <button 
                onClick={() => {
                  const sampleData = "Name,Age,City\nJohn,28,New York\nSarah,32,San Francisco\nMike,45,Chicago\nEmma,37,Boston";
                  setFileData(sampleData);
                  setFileName("Sample Data");
                  setFileType('csv');
                  parseFile(sampleData, ',');
                  setShowDropzone(false);
                }}
                className={`px-3 py-1 text-xs rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Load Sample Data
              </button>
            </div>
            {error && <p className="mt-4 text-red-500">{error}</p>}
            {loading && <p className={`mt-4 ${darkMode ? 'text-lime-400' : 'text-lime-600'}`}>Processing your file...</p>}
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex border-b mb-6">
              <button 
                onClick={() => setActiveTab('data')} 
                className={`py-3 px-6 font-medium transition-colors ${
                  activeTab === 'data' 
                    ? darkMode 
                      ? 'border-b-2 border-lime-500 text-lime-400' 
                      : 'border-b-2 border-lime-600 text-lime-700'
                    : darkMode 
                      ? 'text-gray-400 hover:text-gray-300' 
                      : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Data Table
              </button>
              <button 
                onClick={() => setActiveTab('stats')} 
                className={`py-3 px-6 font-medium transition-colors ${
                  activeTab === 'stats' 
                    ? darkMode 
                      ? 'border-b-2 border-lime-500 text-lime-400' 
                      : 'border-b-2 border-lime-600 text-lime-700'
                    : darkMode 
                      ? 'text-gray-400 hover:text-gray-300' 
                      : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Statistics
              </button>
              <button 
                onClick={() => setActiveTab('chart')} 
                className={`py-3 px-6 font-medium transition-colors ${
                  activeTab === 'chart' 
                    ? darkMode 
                      ? 'border-b-2 border-lime-500 text-lime-400' 
                      : 'border-b-2 border-lime-600 text-lime-700'
                    : darkMode 
                      ? 'text-gray-400 hover:text-gray-300' 
                      : 'text-gray-500 hover:text-gray-700'
                }`}
                disabled={numericColumns.length === 0}
              >
                Visualization
              </button>
              <div className="flex-grow"></div>
              <button 
                onClick={() => resetViewer()}
                className={`py-2 px-4 rounded-lg my-1 text-sm font-medium ${
                  darkMode 
                    ? 'bg-red-800 hover:bg-red-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                New File
              </button>
            </div>

            {/* Control panel */}
            {activeTab === 'data' && (
              <div className={`p-6 mb-6 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Filter controls */}
                  <div>
                    <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Filter Column
                    </label>
                    <select 
                      value={filterColumn} 
                      onChange={(e) => setFilterColumn(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-lime-500' 
                          : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-lime-500'
                      }`}
                    >
                      <option value="">Select column</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Filter Value
                    </label>
                    <input 
                      type="text" 
                      value={filterValue} 
                      onChange={(e) => setFilterValue(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-lime-500' 
                          : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-lime-500'
                      }`}
                      placeholder="Enter filter value"
                    />
                  </div>
                  
                  <div>
                    <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Rows Per Page
                    </label>
                    <select 
                      value={rowsPerPage} 
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className={`w-full p-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-lime-500' 
                          : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-lime-500'
                      }`}
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-3">
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Showing {filteredData.length} of {parsedData ? parsedData.length : 0} rows
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const allColumns = columns.slice();
                        setSelectedColumns(allColumns);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      Show All Columns
                    </button>
                    <button 
                      onClick={exportData}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        darkMode 
                          ? 'bg-lime-700 hover:bg-lime-600 text-white' 
                          : 'bg-lime-500 hover:bg-lime-600 text-white'
                      }`}
                    >
                      Export Data
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Column selector (only visible in data tab) */}
            {activeTab === 'data' && (
              <div className={`p-6 mb-6 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Column Visibility
                </h2>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col) => (
                    <label 
                      key={col} 
                      className={`
                        inline-flex items-center px-3 py-1.5 rounded-full cursor-pointer transition-colors
                        ${selectedColumns.includes(col) 
                          ? darkMode 
                            ? 'bg-lime-800 text-lime-100' 
                            : 'bg-lime-100 text-lime-800'
                          : darkMode 
                            ? 'bg-gray-700 text-gray-400' 
                            : 'bg-gray-200 text-gray-600'
                        }
                      `}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedColumns.includes(col)} 
                        onChange={() => toggleColumnSelection(col)}
                        className="sr-only"
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics tab */}
            {activeTab === 'stats' && (
              <div className={`p-6 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Numeric Column Statistics
                </h2>
                {Object.keys(statistics).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(statistics).map(([column, stats]) => (
                      <div key={column} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <h3 className={`text-md font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{column}</h3>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Minimum:</span>
                            <span className="font-medium">{stats.min?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Maximum:</span>
                            <span className="font-medium">{stats.max?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Average:</span>
                            <span className="font-medium">{stats.avg?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Sum:</span>
                            <span className="font-medium">{stats.sum?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Count:</span>
                            <span className="font-medium">{stats.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center p-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No numeric columns found in the data
                  </div>
                )}
              </div>
            )}

            {/* Chart tab */}
            {activeTab === 'chart' && (
              <div className={`p-6 rounded-lg shadow-sm ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Data Visualization
                  </h2>
                  <div className="flex items-center">
                    <label className={`mr-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Select Column:
                    </label>
                    <select 
                      value={chartColumn} 
                      onChange={(e) => setChartColumn(e.target.value)}
                      className={`p-2 rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-200' 
                          : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                    >
                      {numericColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis 
                        dataKey="index" 
                        stroke={darkMode ? '#9ca3af' : '#6b7280'} 
                        label={{ 
                          value: 'Row Index', 
                          position: 'insideBottomRight', 
                          offset: -10,
                          fill: darkMode ? '#d1d5db' : '#374151' 
                        }} 
                      />
                      <YAxis 
                        stroke={darkMode ? '#9ca3af' : '#6b7280'} 
                        label={{ 
                          value: chartColumn, 
                          angle: -90, 
                          position: 'insideLeft',
                          fill: darkMode ? '#d1d5db' : '#374151' 
                        }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                          borderColor: darkMode ? '#4b5563' : '#e5e7eb',
                          color: darkMode ? '#f3f4f6' : '#111827' 
                        }} 
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name={chartColumn} 
                        stroke="#84cc16" 
                        fill="url(#colorValue)" 
                        activeDot={{ r: 8 }} 
                        strokeWidth={2}
                      />
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#84cc16" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#84cc16" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center mt-4 text-sm text-gray-500">
                  Showing first 50 rows of data
                </p>
              </div>
            )}
            
            {activeTab === 'data' && (
              <>
                {/* Data table */}
                <div className={`rounded-lg shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        <tr>
                          {selectedColumns.map((column) => (
                            <th 
                              key={column} 
                              onClick={() => handleSort(column)}
                              className={`
                                px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer
                                ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                                ${sortColumn === column ? 'bg-opacity-50 bg-lime-200 dark:bg-lime-900 dark:bg-opacity-30' : ''}
                              `}
                            >
                              <div className="flex items-center">
                                <span>{column}</span>
                                {sortColumn === column && (
                                  <span className="ml-1">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {paginatedData.length > 0 ? (
                          paginatedData.map((row, rowIndex) => (
                            <tr 
                              key={rowIndex}
                              className={`
                                transition-colors hover:bg-gray-50 dark:hover:bg-gray-700
                                ${darkMode 
                                  ? rowIndex % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750' 
                                  : rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }
                              `}
                            >
                              {selectedColumns.map((column) => (
                                <td 
                                  key={`${rowIndex}-${column}`} 
                                  className="px-6 py-4 whitespace-nowrap text-sm"
                                >
                                  {row[column] === null || row[column] === undefined ? '' : String(row[column])}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td 
                              colSpan={selectedColumns.length} 
                              className="px-6 py-8 text-center text-sm"
                            >
                              No matching data found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  <div className={`p-4 flex justify-between items-center border-t ${darkMode ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Page {page} of {Math.max(1, Math.ceil(filteredData.length / rowsPerPage))}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className={`
                          px-4 py-2 rounded-md text-sm font-medium transition-colors
                          ${page === 1 
                            ? darkMode 
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : darkMode 
                              ? 'bg-lime-700 text-white hover:bg-lime-600' 
                              : 'bg-lime-500 text-white hover:bg-lime-600'
                          }
                        `}
                      >
                        Previous
                      </button>
                      <button 
                        onClick={() => setPage(Math.min(Math.ceil(filteredData.length / rowsPerPage), page + 1))}
                        disabled={page >= Math.ceil(filteredData.length / rowsPerPage)}
                        className={`
                          px-4 py-2 rounded-md text-sm font-medium transition-colors
                          ${page >= Math.ceil(filteredData.length / rowsPerPage) 
                            ? darkMode 
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : darkMode 
                              ? 'bg-lime-700 text-white hover:bg-lime-600' 
                              : 'bg-lime-500 text-white hover:bg-lime-600'
                          }
                        `}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CSVTSVViewer;