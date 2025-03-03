// -----------------------
// MemoryPanel.tsx
// -----------------------
import  { FC } from 'react';
import { MemoryRegister } from '../../../types/CalculatorTypes';

interface MemoryPanelProps {
  memories: MemoryRegister[];
  memoryClearAll: () => void;
  memoryRecall: (index: number) => void;
  memoryAdd: (index: number) => void;
  memorySubtract: (index: number) => void;
  memoryClear: (index: number) => void;
}

const MemoryPanel: FC<MemoryPanelProps> = ({
  memories,
  memoryClearAll,
  memoryRecall,
  memoryAdd,
  memorySubtract,
  memoryClear,
}) => {
  return (
    <div className="mt-4 p-3 rounded-lg bg-white shadow-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-gray-800">Memory Registers</h3>
        <button
          className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
          onClick={memoryClearAll}
        >
          Clear All
        </button>
      </div>
      <div className="space-y-2">
        {memories.map((mem, i) => (
          <div key={mem.label} className="border-b pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-gray-700">
                {mem.label}: {mem.value === null ? 'null' : mem.value}
              </div>
              <div className="flex space-x-1">
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => memoryRecall(i)}
                >
                  MR
                </button>
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => memoryAdd(i)}
                >
                  M+
                </button>
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => memorySubtract(i)}
                >
                  M-
                </button>
                <button
                  className="text-xs px-2 py-1 rounded bg-red-200 text-red-600 hover:bg-red-300"
                  onClick={() => memoryClear(i)}
                >
                  MC
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryPanel;
