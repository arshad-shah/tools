import React from 'react';
import { Droplet, Save, RefreshCw } from 'lucide-react';

interface QuickActionsProps {
  saveColor: () => void;
  generateRandomColor: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  saveColor,
  generateRandomColor
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-700 flex items-center">
          <Droplet size={15} className="mr-1.5 text-indigo-500" />
          Quick Actions
        </h2>
      </div>
      
      <div className="flex space-x-2">
        <button
          className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white transition-all bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg flex items-center justify-center"
          onClick={saveColor}
        >
          <Save size={16} className="mr-2" />
          Save Color
        </button>
        <button
          className="flex-1 py-2.5 px-4 rounded-lg font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow transition-all flex items-center justify-center"
          onClick={generateRandomColor}
        >
          <RefreshCw size={16} className="mr-2" />
          Random
        </button>
      </div>
    </div>
  );
};

export default QuickActions;