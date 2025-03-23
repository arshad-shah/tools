import React, { useState, useEffect, useRef } from 'react';

interface OrangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  className?: string;
  showTooltip?: boolean;
}

const OrangeSlider: React.FC<OrangeSliderProps> = ({
  min,
  max,
  step,
  value,
  onValueChange,
  className = '',
  showTooltip = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbSize = 20; // Size of the thumb in pixels

  const getPercentage = (value: number): number => {
    return ((value - min) / (max - min)) * 100;
  };

  const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
  };

  const roundToStep = (value: number): number => {
    const valueFromMin = value - min;
    const valueInSteps = Math.round(valueFromMin / step);
    return min + (valueInSteps * step);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    const rawValue = min + ((max - min) * percentage) / 100;
    const newValue = clamp(roundToStep(rawValue), min, max);
    
    onValueChange([newValue]);
  };

  const handleDragStart = (): void => {
    setIsDragging(true);
    setTooltipVisible(true);
  };

  const handleDragEnd = (): void => {
    setIsDragging(false);
    setTimeout(() => setTooltipVisible(false), 1000);
  };

  const handleDrag = (e: MouseEvent): void => {
    if (!isDragging || !trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const rawValue = min + ((max - min) * percentage) / 100;
    const newValue = clamp(roundToStep(rawValue), min, max);
    
    onValueChange([newValue]);
  };

  const handleMouseEnter = (): void => {
    setTooltipVisible(true);
  };

  const handleMouseLeave = (): void => {
    if (!isDragging) {
      setTooltipVisible(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  // Generate marks for the track - fixed distribution
  const marks = [
    { value: min, position: 0 },
    { value: Math.floor(min + (max - min) * 0.2), position: 20 },
    { value: Math.floor(min + (max - min) * 0.4), position: 40 },
    { value: Math.floor(min + (max - min) * 0.6), position: 60 },
    { value: Math.floor(min + (max - min) * 0.8), position: 80 },
    { value: max, position: 100 }
  ];

  const currentValue = value[0];
  const percentage = getPercentage(currentValue);

  return (
    <div 
      className={`w-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Slider root container */}
      <div className="relative py-6">
        {/* Track and marks container */}
        <div className="relative h-10">
          {/* Fixed positioned marks - these go first in the markup */}
          <div className="absolute w-full top-6 flex justify-between px-0">
            {marks.map((mark, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center"
                style={{ width: '1px' }}
              >
                <div className={`h-4 w-0.5 ${index === 0 || index === marks.length - 1 ? 'bg-orange-400' : 'bg-orange-200'}`}></div>
                <span className="text-xs text-gray-500 mt-1 whitespace-nowrap">{mark.value}</span>
              </div>
            ))}
          </div>

          {/* Track background */}
          <div
            ref={trackRef}
            className="absolute h-2 w-full bg-orange-100 rounded-full cursor-pointer top-0"
            onClick={handleTrackClick}
          >
            {/* Track fill */}
            <div
              className="absolute h-full bg-orange-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          {/* Floating tooltip */}
          {showTooltip && tooltipVisible && (
            <div 
              className="absolute rounded-md py-1 px-2 bg-orange-500 text-white text-xs font-semibold -top-8 transform -translate-x-1/2 shadow-md transition-all duration-150 ease-in-out z-10"
              style={{ left: `${percentage}%` }}
            >
              {currentValue}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-orange-500" />
            </div>
          )}
          
          {/* Thumb */}
          <div
            className="absolute top-0 transform -translate-y-1/2 rounded-full bg-white border-2 border-orange-500 shadow-md cursor-grab active:cursor-grabbing transition-all duration-100 hover:scale-110 z-20"
            style={{
              left: `${percentage}%`,
              marginLeft: -(thumbSize / 2),
              width: thumbSize,
              height: thumbSize,
              marginTop: "1px"
            }}
            onMouseDown={handleDragStart}
          >
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrangeSlider;