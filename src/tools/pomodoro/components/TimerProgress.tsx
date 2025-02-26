// TimerProgress.tsx
import React from 'react';
import { Progress } from '../../../components/progress';
import { Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TimerProgressProps {
  progress: number;
  progressColor: string;
}

export const TimerProgress: React.FC<TimerProgressProps> = ({
  progress,
  progressColor,
}) => (
  <div className="relative mb-8 sm:mb-12">
    <Progress 
      value={progress} 
      className={cn(
        "h-2 sm:h-3 rounded-ful overflow-hidden",
        "transition-all duration-300",
        progress > 0 ? progressColor : ''
      )}
    />
    {progress >= 100 && (
      <div className="absolute top-full left-0 right-0 text-center mt-2">
        <div className="inline-flex items-center space-x-1 text-sm text-amber-600">
          <Sparkles className="w-4 h-4" />
          <span>Time's up!</span>
        </div>
      </div>
    )}
  </div>
);
