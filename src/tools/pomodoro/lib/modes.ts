import { Battery, Brain, Coffee } from 'lucide-react';
import type { TimerMode } from '../types';

export const MODE_INFO: Record<
  TimerMode,
  {
    icon: typeof Brain;
    label: string;
    shortLabel: string;
    colorScheme: 'accent' | 'success';
  }
> = {
  work: {
    icon: Brain,
    label: 'Focus Time',
    shortLabel: 'Focus',
    colorScheme: 'accent',
  },
  shortBreak: {
    icon: Coffee,
    label: 'Short Break',
    shortLabel: 'Break',
    colorScheme: 'accent',
  },
  longBreak: {
    icon: Battery,
    label: 'Long Break',
    shortLabel: 'Long',
    colorScheme: 'success',
  },
};
