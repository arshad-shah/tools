import React from 'react';
import { TabProps } from '../../../types/ApiTesterTypes';

export const Tab: React.FC<TabProps> = ({ active, label, onClick, icon: Icon }) => (
  <button
    className={`px-4 py-2 rounded-t-md flex items-center space-x-2 transition-colors ${
      active ? "bg-white text-emerald-600 border-t border-l border-r border-gray-200" : "text-gray-600 hover:bg-gray-100"
    }`}
    onClick={onClick}
  >
    {Icon && <Icon className="h-4 w-4" />}
    <span>{label}</span>
  </button>
);