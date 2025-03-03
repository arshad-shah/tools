// -----------------------
// TabButton.tsx
// -----------------------
import React, { FC } from 'react';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const TabButton: FC<TabButtonProps> = ({ active, onClick, children, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border ${
        active ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'
      }`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </button>
  );
};

export default TabButton;
