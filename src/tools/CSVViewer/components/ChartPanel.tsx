import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartPanelProps, ChartDataPoint } from '../../../types/CsvTsvTypes';

export const ChartPanel: React.FC<ChartPanelProps> = ({
  data,
  numericColumns,
  chartColumn,
  onChartColumnChange
}) => {
  // Prepare chart data - limit to 50 rows for performance
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!data.length || !chartColumn) return [];
    
    return data.slice(0, 50).map((row, index) => ({
      index: index + 1,
      value: row[chartColumn] as number
    }));
  }, [data, chartColumn]);

  // Calculate min and max values for y-axis domain
  const yDomain = useMemo(() => {
    if (!chartData.length) return [0, 100];
    
    const values = chartData.map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Add some padding to the top and bottom
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [chartData]);

  return (
    <div className="p-6 rounded-lg shadow-sm bg-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Data Visualization
        </h2>
        
        {numericColumns.length > 0 ? (
          <div className="flex items-center">
            <label className="mr-2 text-sm font-medium text-gray-700">
              Select Column:
            </label>
            <select 
              value={chartColumn} 
              onChange={(e) => onChartColumnChange(e.target.value)}
              className="p-2 rounded-lg border bg-gray-50 border-gray-300 text-gray-900 
                focus:border-lime-500 focus:ring-1 focus:ring-lime-500"
            >
              {numericColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {numericColumns.length > 0 ? (
        <>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="index" 
                  stroke="#6b7280" 
                  label={{ 
                    value: 'Row Index', 
                    position: 'insideBottomRight', 
                    offset: -10,
                    fill: '#374151' 
                  }} 
                />
                <YAxis 
                  stroke="#6b7280" 
                  domain={yDomain}
                  label={{ 
                    value: chartColumn, 
                    angle: -90, 
                    position: 'insideLeft',
                    fill: '#374151' 
                  }} 
                />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }), chartColumn]}
                  labelFormatter={(index) => `Row ${index}`}
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    borderColor: '#e5e7eb',
                    borderRadius: '0.375rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name={chartColumn} 
                  stroke="#84cc16" 
                  activeDot={{ r: 8, fill: '#65a30d' }} 
                  strokeWidth={3}
                  dot={{ stroke: '#84cc16', strokeWidth: 2, r: 4, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center mt-4 text-sm text-gray-500">
            {data.length > 50 
              ? `Showing first 50 of ${data.length} rows` 
              : `Showing all ${data.length} rows`
            }
          </p>
        </>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <svg 
            className="w-16 h-16 mx-auto text-gray-400 mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-lg font-medium text-gray-700">No numeric columns available for visualization</p>
          <p className="mt-2 text-gray-600">
            Charts require at least one column with numeric data to display.
          </p>
        </div>
      )}
    </div>
  );
};