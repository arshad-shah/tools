import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { DataViewerProps, ParsedData, Statistics, TabOption, SortDirection } from '../../../types/CsvTsvTypes';
import { ControlPanel } from './ControlPanel';
import { DataTable } from './DataTable';
import { StatisticsPanel } from './StatisticsPanel';
import { ChartPanel } from './ChartPanel';

export const DataViewer: React.FC<DataViewerProps> = ({ 
  data, 
  columns, 
  fileName, 
  onReset 
}) => {
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<TabOption>('data');
  
  // State for data filtering and sorting
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // State for table pagination
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  
  // State for column selection
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns);
  
  // State for chart
  const [chartColumn, setChartColumn] = useState<string>('');
  
  // Calculate statistics for numeric columns
  const statistics = useMemo(() => {
    const stats: Statistics = {};
    
    columns.forEach(col => {
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
        
        // Set default chart column to first numeric column if not set
        if (!chartColumn && Object.keys(stats).length === 1) {
          setChartColumn(col);
        }
      }
    });
    
    return stats;
  }, [data, columns, chartColumn]);

  // Filtered data based on search criteria
  const filteredData = useMemo(() => {
    let filtered = data;
    
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
  }, [data, filterColumn, filterValue, sortColumn, sortDirection]);

  // Handle filter change
  const handleFilterChange = (column: string, value: string): void => {
    setFilterColumn(column);
    setFilterValue(value);
    setPage(1); // Reset to first page on filter change
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

  // Toggle column selection
  const toggleColumnSelection = (column: string): void => {
    if (selectedColumns.includes(column)) {
      setSelectedColumns(selectedColumns.filter(col => col !== column));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  // Toggle all columns
  const toggleAllColumns = (): void => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns([...columns]);
    }
  };

  // Get numeric columns for chart
  const numericColumns = useMemo((): string[] => {
    return Object.keys(statistics);
  }, [statistics]);

  // Export data as CSV
  const exportData = (): void => {
    if (!data.length) return;
    
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
    link.setAttribute('download', `exported_${fileName.replace(/\.[^/.]+$/, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex border-b mb-6">
        <button 
          onClick={() => setActiveTab('data')} 
          className={`py-3 px-6 font-medium transition-colors ${
            activeTab === 'data' 
              ? 'border-b-2 border-lime-600 text-lime-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Data Table
        </button>
        <button 
          onClick={() => setActiveTab('stats')} 
          className={`py-3 px-6 font-medium transition-colors ${
            activeTab === 'stats' 
              ? 'border-b-2 border-lime-600 text-lime-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Statistics
        </button>
        <button 
          onClick={() => setActiveTab('chart')} 
          className={`py-3 px-6 font-medium transition-colors ${
            activeTab === 'chart' 
              ? 'border-b-2 border-lime-600 text-lime-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          disabled={numericColumns.length === 0}
        >
          Visualization
        </button>
        <div className="flex-grow"></div>
        <button 
          onClick={onReset}
          className="py-2 px-4 rounded-lg my-1 text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
        >
          New File
        </button>
      </div>

      {/* Control panel (only for data tab) */}
      {activeTab === 'data' && (
        <ControlPanel
          columns={columns}
          selectedColumns={selectedColumns}
          onToggleAllColumns={toggleAllColumns}
          filterColumn={filterColumn}
          filterValue={filterValue}
          onFilterChange={handleFilterChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
          filteredCount={filteredData.length}
          totalCount={data.length}
          onExport={exportData}
        />
      )}

      {/* Column selector (only visible in data tab) */}
      {activeTab === 'data' && (
        <div className="p-6 mb-6 rounded-lg shadow-sm bg-white">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            Column Visibility
          </h2>
          <div className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <label 
                key={col} 
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-full cursor-pointer transition-colors
                  ${selectedColumns.includes(col) 
                    ? 'bg-lime-100 text-lime-800'
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

      {/* Tab content */}
      {activeTab === 'data' && (
        <DataTable
          data={filteredData}
          columns={columns}
          selectedColumns={selectedColumns}
          onToggleColumn={toggleColumnSelection}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          filterColumn={filterColumn}
          filterValue={filterValue}
          onFilterChange={handleFilterChange}
        />
      )}

      {activeTab === 'stats' && (
        <StatisticsPanel statistics={statistics} />
      )}

      {activeTab === 'chart' && (
        <ChartPanel
          data={filteredData}
          numericColumns={numericColumns}
          chartColumn={chartColumn}
          onChartColumnChange={setChartColumn}
        />
      )}
    </div>
  );
};