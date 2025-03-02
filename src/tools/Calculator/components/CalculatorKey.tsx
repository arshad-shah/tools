// -----------------------
// CalculatorKey.tsx
// -----------------------
import React, { FC } from 'react';

interface CalculatorKeyProps {
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

const CalculatorKey: FC<CalculatorKeyProps> = ({
  className = '',
  onClick,
  children,
  icon,
}) => {
  const baseClasses =
    'flex items-center justify-center p-3 rounded-xl text-lg font-medium shadow-md transition-all duration-150 transform hover:scale-105 active:scale-95 cursor-pointer';

  return (
    <div className={`${baseClasses} ${className}`} onClick={onClick}>
      {icon ? <span className="flex items-center justify-center">{icon}</span> : children}
    </div>
  );
};

export default CalculatorKey;
