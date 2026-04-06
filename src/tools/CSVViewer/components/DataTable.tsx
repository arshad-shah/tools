import React, { useMemo } from 'react';
import { DataTableProps } from '../../../types/CsvTsvTypes';

export const DataTable: React.FC<DataTableProps> = ({
  data,
  selectedColumns,
  sortColumn,
  sortDirection,
  onSort,
  page,
  rowsPerPage,
  onPageChange,
}) => {
  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return data.slice(startIndex, startIndex + rowsPerPage);
  }, [data, page, rowsPerPage]);

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));

  return (
    <div className="rounded-lg shadow-sm overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {selectedColumns.map((column) => (
                <th 
                  key={column} 
                  onClick={() => onSort(column)}
                  className={`
                    px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer
                    text-gray-700
                    ${sortColumn === column ? 'bg-opacity-50 bg-lime-200' : ''}
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
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  className={`
                    transition-colors hover:bg-gray-50
                    ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  `}
                >
                  {selectedColumns.map((column) => {
                    const cellValue = row[column];
                    const displayValue = 
                      cellValue === null || cellValue === undefined 
                        ? '' 
                        : String(cellValue);
                    
                    return (
                      <td 
                        key={`${rowIndex}-${column}`} 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-800"
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={selectedColumns.length} 
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No matching data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="p-4 flex justify-between items-center border-t bg-gray-50 border-gray-200">
        <div className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${page === 1 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-lime-500 text-white hover:bg-lime-600'
              }
            `}
            aria-label="Previous page"
          >
            Previous
          </button>
          <button 
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${page >= totalPages 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-lime-500 text-white hover:bg-lime-600'
              }
            `}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};