import React from 'react';
import { Sparkles, Heart, Eye, ShieldCheck } from 'lucide-react';
import { TabType } from '../../../types/ColorTesterTypes';

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="flex items-center border-b border-gray-100">
      <button
        className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'harmony' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        onClick={() => setActiveTab('harmony')}
      >
        <div className="flex items-center justify-center">
          <Sparkles size={15} className="mr-1.5" />
          Harmony
        </div>
        {activeTab === 'harmony' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
        )}
      </button>
      
      <button
        className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'psychology' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        onClick={() => setActiveTab('psychology')}
      >
        <div className="flex items-center justify-center">
          <Heart size={15} className="mr-1.5" />
          Psychology
        </div>
        {activeTab === 'psychology' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
        )}
      </button>
      
      <button
        className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'preview' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        onClick={() => setActiveTab('preview')}
      >
        <div className="flex items-center justify-center">
          <Eye size={15} className="mr-1.5" />
          Preview
        </div>
        {activeTab === 'preview' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
        )}
      </button>
      
      <button
        className={`flex-1 py-3 text-sm font-medium relative ${activeTab === 'accessibility' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        onClick={() => setActiveTab('accessibility')}
      >
        <div className="flex items-center justify-center">
          <ShieldCheck size={15} className="mr-1.5" />
          Accessibility
        </div>
        {activeTab === 'accessibility' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
        )}
      </button>
    </div>
  );
};

export default TabNavigation;