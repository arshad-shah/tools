/* eslint-disable @typescript-eslint/no-explicit-any */
// TimerControls.tsx
import React from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/utils';

interface TimerControlsProps {
  isActive: boolean;
  theme: any;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isActive,
  theme,
  onToggle,
  onReset,
  onSkip,
}) => (
  <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
    <Button
      onClick={onToggle}
      size="lg"
      className={cn(
        "w-full sm:w-auto px-8 sm:px-10 py-6 sm:py-7 rounded-xl sm:rounded-2xl",
        "transition-all duration-300 transform hover:scale-105 hover:-translate-y-1",
        "flex items-center justify-center text-white",
        isActive 
          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200/50' 
          : cn(
              'bg-gradient-to-r shadow-lg',
              theme.gradient,
              theme.glowColor
            )
      )}
    >
      {isActive ? (
        <>
          <Pause className="w-5 h-5 sm:w-6 sm:h-6 mr-3 group-hover:scale-110 transition-transform" />
          <span className="text-base sm:text-lg font-medium">Pause</span>
        </>
      ) : (
        <>
          <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-3 group-hover:scale-110 transition-transform" />
          <span className="text-base sm:text-lg font-medium">Start</span>
        </>
      )}
    </Button>

    <div className="flex space-x-3">
      <Button 
        onClick={onReset}
        variant="outline" 
        size="icon"
        className={cn(
          "w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl border-2",
          "hover:scale-105 transition-all duration-300 hover:-translate-y-1",
          theme.glowColor,
          "hover:border-transparent",
          "hover:bg-gradient-to-br hover:text-white",
          theme.gradient
        )}
      >
        <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>
      <Button 
        onClick={onSkip}
        variant="outline" 
        size="icon"
        className={cn(
          "w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl border-2",
          "hover:scale-105 transition-all duration-300 hover:-translate-y-1",
          theme.glowColor,
          "hover:border-transparent",
          "hover:bg-gradient-to-br hover:text-white",
          theme.gradient
        )}
      >
        <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>
    </div>
  </div>
);