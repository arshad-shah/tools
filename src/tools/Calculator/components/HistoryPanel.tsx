// -----------------------
// HistoryPanel.tsx
// -----------------------
import React, { FC } from 'react';
import { CalculationHistoryItem } from '../../../types/CalculatorTypes';

interface HistoryPanelProps {
  calculationHistory: CalculationHistoryItem[];
  showTimestamp: boolean;
  setCalculationHistory: React.Dispatch<React.SetStateAction<CalculationHistoryItem[]>>;
  onUseResult: (value: string) => void;
}

const HistoryPanel: FC<HistoryPanelProps> = ({
  calculationHistory,
  showTimestamp,
  setCalculationHistory,
  onUseResult,
}) => {
  if (calculationHistory.length === 0) return null;

  return (
    <div className="mt-4 p-3 rounded-lg bg-white shadow-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-800">Calculation History</h3>
        <button
          className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
          onClick={() => setCalculationHistory([])}
        >
          Clear
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {calculationHistory.map((item, index) => {
          if (typeof item === 'string') {
            return (
              <div key={index} className="py-2 border-b border-gray-100">
                <div className="text-gray-700">{item}</div>
                <button
                  className="mt-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                  onClick={() => {
                    // parse out the result from "X = Y"
                    const parts = item.split(' = ');
                    if (parts.length === 2) onUseResult(parts[1]);
                  }}
                >
                  Use Result
                </button>
              </div>
            );
          } else {
            return (
              <div key={index} className="py-2 border-b border-gray-100">
                <div className="text-gray-700">{item.calculation}</div>
                {showTimestamp && item.timestamp && (
                  <div className="text-xs text-gray-500">{item.timestamp}</div>
                )}
                <button
                  className="mt-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                  onClick={() => {
                    const parts = item.calculation.split(' = ');
                    if (parts.length === 2) onUseResult(parts[1]);
                  }}
                >
                  Use Result
                </button>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

export default HistoryPanel;
