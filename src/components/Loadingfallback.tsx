// src/components/LoadingFallback.tsx

import React, { useEffect, useState } from 'react';

interface LoadingFallbackProps {
  toolName?: string;
  delay?: number; // Delay before showing loading (prevents flash for fast loads)
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  toolName,
  delay = 300 
}) => {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  // Don't render anything until the delay has passed
  if (!show) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
      <div className="text-center p-4">
        <div className="flex justify-center mb-4">
          <div className="relative w-16 h-16">
            {/* Spinner animation */}
            <div className="absolute top-0 left-0 right-0 bottom-0">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin absolute top-0"></div>
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-800">
          {toolName ? `Loading ${toolName}...` : 'Loading...'}
        </h3>
        
        <div className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
          <div className="w-full bg-gray-200 rounded-full h-1 mt-4">
            <div className="bg-blue-600 h-1 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingFallback;