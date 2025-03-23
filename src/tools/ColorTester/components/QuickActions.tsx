import React from 'react';
import { Wand2, Save, RefreshCw, Sparkles } from 'lucide-react';

interface QuickActionsProps {
  saveColor: () => void;
  generateRandomColor: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  saveColor,
  generateRandomColor
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 border border-indigo-100">
      <div className="flex items-center mb-4">
        <Wand2 size={18} className="mr-2 text-indigo-500" />
        <h2 className="text-lg font-medium text-gray-800">Quick Actions</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          className="col-span-1 py-3 px-4 rounded-xl font-medium text-white transition-all duration-300 
                     bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 
                     shadow-md hover:shadow-xl border border-indigo-400 
                     flex items-center justify-center group"
          onClick={saveColor}
        >
          <Save size={18} className="mr-2 group-hover:animate-pulse" />
          <span>Save Color</span>
        </button>
        
        <button
          className="col-span-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 
                    bg-white text-indigo-600 hover:bg-indigo-50 
                    border-2 border-indigo-200 shadow-sm hover:shadow 
                    flex items-center justify-center group"
          onClick={generateRandomColor}
        >
          <RefreshCw size={18} className="mr-2 group-hover:rotate-180 transition-transform duration-500" />
          <span>Random</span>
        </button>
        
        <button
          className="col-span-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 
                    bg-gradient-to-br from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600
                    text-white shadow-md hover:shadow-xl border border-purple-400
                    flex items-center justify-center group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 
                        transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <Sparkles size={18} className="mr-2" />
          <span>Generate Palette</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;