
import React, { useState } from 'react';
import { 
  Trash2, CheckCircle2, Circle, Timer, Sparkles
} from 'lucide-react';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/utils';
import { Task } from '../../../types/PomodoroTypes';

const TaskItem: React.FC<{
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}> = ({ task, onUpdate, onDelete }) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "group flex items-center justify-between",
        "p-3 sm:p-4 rounded-xl transition-all duration-300",
        "hover:shadow-md hover:-translate-y-0.5",
        task.completed 
          ? 'bg-gray-50/80 backdrop-blur-sm border border-gray-100' 
          : 'bg-white shadow-sm hover:shadow-gray-200'
      )}
    >
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
        <button
          onClick={() => onUpdate({ completed: !task.completed })}
          className={cn(
            "flex-shrink-0 p-1 rounded-full transition-all duration-300",
            "focus:outline-none focus:ring-2 focus:ring-violet-500",
            "hover:bg-violet-50 group/check"
          )}
        >
          {task.completed ? (
            <div className="relative">
              <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-green-500 transition-colors duration-200" />
              <Sparkles 
                className={cn(
                  "absolute -right-1 -top-1 w-3 h-3 text-yellow-400",
                  "opacity-0 group-hover/check:opacity-100 transition-opacity duration-200"
                )}
              />
            </div>
          ) : (
            <Circle className="w-5 sm:w-6 h-5 sm:h-6 text-gray-300 hover:text-violet-500 
                           transition-colors duration-200" />
          )}
        </button>
        
        {/* Task Title */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            "block text-sm sm:text-base truncate transition-colors duration-200",
            task.completed 
              ? 'text-gray-400 line-through' 
              : 'text-gray-700'
          )}>
            {task.title}
          </span>
          
          {/* Mobile Pomodoro Counter */}
          <div className="sm:hidden mt-1">
            <div className={cn(
              "inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs",
              task.completed
                ? 'bg-gray-100 text-gray-400'
                : 'bg-violet-50 text-violet-600'
            )}>
              <Timer className="w-3 h-3" />
              <span>{task.completedPomodoros}/{task.pomodoros}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center space-x-3 flex-shrink-0">
        {/* Pomodoro Counter */}
        <div className={cn(
          "flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm",
          "transition-all duration-200",
          task.completed
            ? 'bg-gray-100 text-gray-400'
            : cn(
                'bg-violet-50 text-violet-600',
                task.completedPomodoros >= task.pomodoros && 'bg-green-50 text-green-600'
              )
        )}>
          <Timer className="w-4 h-4" />
          <span>{task.completedPomodoros}/{task.pomodoros}</span>
        </div>
        
        {/* Delete Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className={cn(
            "opacity-0 group-hover:opacity-100",
            "hover:bg-red-50 hover:text-red-500",
            "transition-all duration-200 rounded-lg",
            isHovering && "sm:animate-pulse"
          )}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Mobile Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="sm:hidden hover:bg-red-50 hover:text-red-500 
                 transition-colors duration-200 rounded-lg p-2"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default TaskItem;