import React from 'react';
import { StatisticsPanelProps, ColumnStatistics } from '../../../types/CsvTsvTypes';

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ statistics }) => {
  // Format number with proper decimal places
  const formatNumber = (value: number, decimals = 2): string => {
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };
  
  // Render a stat card for each numeric column
  const renderStatCard = (column: string, stats: ColumnStatistics) => {
    return (
      <div key={column} className="p-4 rounded-lg border bg-gray-50 border-gray-200 transition-all hover:shadow-md">
        <h3 className="text-md font-semibold mb-2 text-gray-800 border-b pb-2">{column}</h3>
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Minimum:</span>
            <span className="font-medium text-gray-900">{formatNumber(stats.min)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Maximum:</span>
            <span className="font-medium text-gray-900">{formatNumber(stats.max)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Average:</span>
            <span className="font-medium text-gray-900">{formatNumber(stats.avg)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Sum:</span>
            <span className="font-medium text-gray-900">{formatNumber(stats.sum)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Count:</span>
            <span className="font-medium text-gray-900">{stats.count.toLocaleString()}</span>
          </div>
          
          {/* Visual min/max range indicator */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-lime-500 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1 text-gray-500">
              <span>{formatNumber(stats.min)}</span>
              <span>{formatNumber(stats.max)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 rounded-lg shadow-sm bg-white">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">
        Numeric Column Statistics
      </h2>
      {Object.keys(statistics).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(statistics).map(([column, stats]) => renderStatCard(column, stats))}
        </div>
      ) : (
        <div className="text-center p-8 text-gray-600 bg-gray-50 rounded-lg">
          <svg 
            className="w-12 h-12 mx-auto text-gray-400 mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium">No numeric columns found in the data</p>
          <p className="mt-2">Statistics can only be calculated for columns with numeric values.</p>
        </div>
      )}
    </div>
  );
};