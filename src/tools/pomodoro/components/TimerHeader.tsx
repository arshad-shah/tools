/* eslint-disable @typescript-eslint/no-explicit-any */
// TimerHeader.tsx
import React from 'react';
import { Flame, ListTodo } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TimerHeaderProps {
  mode: string;
  theme: any;
  dailyPomodoros: number;
  currentTask: any;
}

export const TimerHeader: React.FC<TimerHeaderProps> = ({
  mode,
  theme,
  dailyPomodoros,
  currentTask,
}) => (
  <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-4 mb-6 sm:mb-8">
    <div className={cn(
      "p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white shadow-lg mb-4 sm:mb-0",
      theme.glowColor
    )}>
      {mode === 'work' && currentTask ? (
        <ListTodo className={cn(
          "w-6 h-6 sm:w-8 sm:h-8",
          theme.iconColor
        )} />
      ) : (
        <theme.icon className={cn(
          "w-6 h-6 sm:w-8 sm:h-8",
          theme.iconColor
        )} />
      )}
    </div>
    <div className="flex flex-col sm:flex-row items-center sm:space-x-3">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">
        <span className="hidden sm:inline">{theme.title}</span>
        <span className="sm:hidden">{theme.shortTitle}</span>
      </h2>
      {mode === 'work' && dailyPomodoros > 0 && (
        <div className={cn(
          "flex items-center space-x-1 px-3 py-1",
          "bg-amber-50 text-amber-600 rounded-full text-sm"
        )}>
          <Flame className="w-4 h-4" />
          <span>{dailyPomodoros} today</span>
        </div>
      )}
    </div>
  </div>
);