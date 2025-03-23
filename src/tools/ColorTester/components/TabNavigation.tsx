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
  const tabs = [
    { id: 'harmony' as TabType, label: 'Harmony', icon: Sparkles },
    { id: 'psychology' as TabType, label: 'Psychology', icon: Heart },
    { id: 'preview' as TabType, label: 'Preview', icon: Eye },
    { id: 'accessibility' as TabType, label: 'Accessibility', icon: ShieldCheck }
  ];

  return (
    <div className="bg-white rounded-t-3xl border-b border-indigo-100 overflow-hidden shadow-sm">
      {/* Desktop Tabs */}
      <div className="hidden md:flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              className={`
                flex-1 py-4 relative transition-all duration-300 group
                ${isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'}
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full mb-1 transition-all
                  ${isActive 
                    ? 'bg-indigo-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}
                `}>
                  <Icon size={18} />
                </div>
                <span className={`
                  text-sm font-medium transition-colors
                  ${isActive ? 'text-indigo-700' : 'text-gray-600 group-hover:text-gray-800'}
                `}>
                  {tab.label}
                </span>
                
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Mobile Tabs */}
      <div className="flex md:hidden overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              className={`
                flex-1 py-3 relative transition-all duration-300 group
                ${isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'}
              `}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center justify-center">
                <Icon size={16} className={`
                  mr-1 transition-colors
                  ${isActive ? 'text-indigo-600' : 'text-gray-500'}
                `} />
                <span className={`
                  text-xs font-medium transition-colors
                  ${isActive ? 'text-indigo-700' : 'text-gray-600'}
                `}>
                  {tab.label}
                </span>
              </div>
              
              {isActive && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;