// TimerDisplay.tsx
import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TimerDisplayProps {
  timeLeft: number;
  progress: number;
  formatTime: (seconds: number) => string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeLeft,
  progress,
  formatTime,
}) => (
  <div className="mb-6 sm:mb-8">
    <div className={cn(
      "text-6xl sm:text-8xl font-mono font-bold tracking-tighter",
      "bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent",
      "hover:scale-105 transition-transform duration-300",
      "group cursor-default"
    )}>
      {formatTime(timeLeft)}
      {progress >= 100 && (
        <CheckCircle2 className="w-8 h-8 text-green-500 absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
    </div>
    <div className="text-sm text-gray-600 mt-4 flex items-center justify-center font-medium">
      <Clock className="w-4 h-4 mr-2" />
      {Math.floor(timeLeft / 60)} minutes remaining
    </div>
  </div>
);