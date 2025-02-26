import React from 'react';
import { Brain, Coffee, Battery } from 'lucide-react';
import { Button } from '../../../components/Button';
import { cn } from '../../../lib/utils';

type Mode = 'work' | 'shortBreak' | 'longBreak';

interface ModeSelectorProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

const MODES = {
  work: {
    icon: Brain,
    label: 'Focus Time',
    shortLabel: 'Focus',
    activeClass: 'bg-gradient-to-br from-violet-500 to-violet-600',
    hoverClass: 'hover:bg-violet-50',
    glowClass: 'shadow-violet-200/50',
    inactiveTextClass: 'text-gray-500 hover:text-violet-500',
    accentClass: 'bg-violet-100',
  },
  shortBreak: {
    icon: Coffee,
    label: 'Break Time',
    shortLabel: 'Break',
    activeClass: 'bg-gradient-to-br from-blue-500 to-blue-600',
    hoverClass: 'hover:bg-blue-50',
    glowClass: 'shadow-blue-200/50',
    inactiveTextClass: 'text-gray-500 hover:text-blue-500',
    accentClass: 'bg-blue-100',
  },
  longBreak: {
    icon: Battery,
    label: 'Long Break',
    shortLabel: 'Long',
    activeClass: 'bg-gradient-to-br from-green-500 to-green-600',
    hoverClass: 'hover:bg-green-50',
    glowClass: 'shadow-green-200/50',
    inactiveTextClass: 'text-gray-500 hover:text-green-500',
    accentClass: 'bg-green-100',
  },
} as const;

const ModeButton: React.FC<{
  mode: Mode;
  isActive: boolean;
  onClick: () => void;
}> = ({ mode, isActive, onClick }) => {
  const { 
    icon: Icon, 
    label, 
    shortLabel,
    activeClass, 
    hoverClass, 
    glowClass,
    inactiveTextClass,
    accentClass,
  } = MODES[mode];
  
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        // Base styles
        "relative overflow-hidden",
        "flex items-center justify-center",
        "transition-all duration-300",
        
        // Responsive padding and width
        "w-full sm:w-auto",
        "p-6",
        "rounded-xl",
        
        // Hover and active states
        "transform hover:-translate-y-0.5",
        "hover:shadow-lg",
        
        // Active/inactive states
        isActive ? cn(
          activeClass,
          "shadow-lg",
          glowClass
        ) : cn(
          hoverClass,
          "hover:shadow-md"
        ),
        
        // Group styling
        "group"
      )}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Sparkle effect on active state */}
      {isActive && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-2 opacity-0 group-hover:opacity-100
                       transition-opacity duration-1000">
            <div className="absolute inset-0 rotate-45 transform translate-y-full group-hover:translate-y-0
                         transition-transform duration-1000">
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
        </div>
      )}
      
      {/* Content wrapper */}
      <div className="relative flex items-center space-x-2">
        {/* Icon with dynamic styling */}
        <div className={cn(
          "p-1.5 rounded-lg transition-colors duration-300",
          isActive ? "text-white" : accentClass
        )}>
          <Icon className={cn(
            "w-4 h-4 sm:w-5 sm:h-5",
            "transition-all duration-300",
            "group-hover:scale-110",
            isActive ? "text-white" : "text-gray-600"
          )} />
        </div>
        
        {/* Label with responsive text */}
        <span className={cn(
          "font-medium transition-colors duration-300",
          "text-sm sm:text-base",
          isActive ? "text-white" : inactiveTextClass
        )}>
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{shortLabel}</span>
        </span>
      </div>
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-1/2 transform -translate-x-1/2 
                      flex space-x-1">
          <div className="w-1 h-1 rounded-full bg-white/70 
                       bottom-1.5 absolute" />
        </div>
      )}
    </Button>
  );
};

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="w-full px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center 
                    justify-center space-y-2 sm:space-y-0 sm:space-x-3 md:space-x-6">
        {(Object.keys(MODES) as Mode[]).map((mode) => (
          <ModeButton
            key={mode}
            mode={mode}
            isActive={currentMode === mode}
            onClick={() => onModeChange(mode)}
          />
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;