import React from 'react';
import { ControlPanelProps } from '../../../types/CsvTsvTypes';

export const ControlPanel: React.FC<ControlPanelProps> = ({
  columns,
  selectedColumns,
  onToggleAllColumns,
  filterColumn,
  filterValue,
  onFilterChange,
  rowsPerPage,
  onRowsPerPageChange,
  filteredCount,
  totalCount,
  onExport
}) => {
  return (
    <div className="p-6 mb-6 rounded-lg shadow-sm bg-white">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Filter by column control */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Filter Column
          </label>
          <select 
            value={filterColumn} 
            onChange={(e) => onFilterChange(e.target.value, filterValue)}
            className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 text-gray-900 focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
          >
            <option value="">Select column</option>
            {columns.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
        
        {/* Filter value input */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Filter Value
          </label>
          <input 
            type="text" 
            value={filterValue} 
            onChange={(e) => onFilterChange(filterColumn, e.target.value)}
            className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 text-gray-900 focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
            placeholder="Enter filter value"
            disabled={!filterColumn}
          />
        </div>
        
        {/* Rows per page selector */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Rows Per Page
          </label>
          <select 
            value={rowsPerPage} 
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="w-full p-2 rounded-lg border bg-gray-50 border-gray-300 text-gray-900 focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
      
      {/* Row counts and action buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-3">
        <div className="text-sm text-gray-600">
          {filteredCount === totalCount ? (
            <span>Showing all {totalCount} rows</span>
          ) : (
            <span>Showing {filteredCount} of {totalCount} rows</span>
          )}
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onToggleAllColumns}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
          >
            {selectedColumns.length === columns.length ? 'Hide All Columns' : 'Show All Columns'}
          </button>
          <button 
            onClick={onExport}
            disabled={filteredCount === 0}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filteredCount === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-lime-500 hover:bg-lime-600 text-white'
            }`}
          >
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};