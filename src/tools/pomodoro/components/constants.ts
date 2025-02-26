import { 
Brain,
  Coffee, Battery
} from 'lucide-react';

const TIMER_THEMES = {
  work: {
    icon: Brain,
    title: 'Focus Time',
    shortTitle: 'Focus',
    gradient: 'from-violet-500 to-fuchsia-500',
    iconColor: 'text-violet-500',
    progressColor: 'bg-violet-500',
    glowColor: 'shadow-violet-500/25',
    accentLight: 'bg-violet-50',
    accentText: 'text-violet-600',
  },
  shortBreak: {
    icon: Coffee,
    title: 'Short Break',
    shortTitle: 'Break',
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-500',
    progressColor: 'bg-blue-500',
    glowColor: 'shadow-blue-500/25',
    accentLight: 'bg-blue-50',
    accentText: 'text-blue-600',
  },
  longBreak: {
    icon: Battery,
    title: 'Long Break',
    shortTitle: 'Long Break',
    gradient: 'from-green-500 to-emerald-500',
    iconColor: 'text-green-500',
    progressColor: 'bg-green-500',
    glowColor: 'shadow-green-500/25',
    accentLight: 'bg-green-50',
    accentText: 'text-green-600',
  },
};

export { TIMER_THEMES };