// -----------------------
// FavoritesPanel.tsx
// -----------------------
import React, { FC } from 'react';
import { SavedCalculation } from '../../../types/CalculatorTypes';
import { Trash2 } from 'lucide-react';

interface FavoritesPanelProps {
  savedCalculations: SavedCalculation[];
  setSavedCalculations: React.Dispatch<React.SetStateAction<SavedCalculation[]>>;
  onUseResult: (value: string) => void;
}

const FavoritesPanel: FC<FavoritesPanelProps> = ({
  savedCalculations,
  setSavedCalculations,
  onUseResult,
}) => {
  const clearAll = () => {
    setSavedCalculations([]);
  };

  if (!savedCalculations) return null;

  return (
    <div className="mt-4 p-3 rounded-lg bg-white shadow-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-800">Saved Calculations</h3>
        {savedCalculations.length > 0 && (
          <button
            className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
            onClick={clearAll}
          >
            Clear All
          </button>
        )}
      </div>
      {savedCalculations.length === 0 ? (
        <div className="text-center text-gray-500 py-4">No saved calculations yet</div>
      ) : (
        <div className="max-h-60 overflow-y-auto">
          {savedCalculations.map((item, index) => (
            <div key={index} className="py-2 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-gray-700">{item.calculation}</div>
                  {item.timestamp && (
                    <div className="text-xs text-gray-500">{item.timestamp}</div>
                  )}
                </div>
                <button
                  className="text-yellow-500 hover:text-yellow-600"
                  onClick={() => {
                    const newSaved = [...savedCalculations];
                    newSaved.splice(index, 1);
                    setSavedCalculations(newSaved);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <button
                className="mt-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                onClick={() => {
                  const parts = item.calculation.split(' = ');
                  if (parts.length === 2) {
                    onUseResult(parts[1]);
                  }
                }}
              >
                Use Result
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPanel;
