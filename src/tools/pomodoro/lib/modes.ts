import { IconBattery, IconBrain, IconCoffee } from '@/shared/ui/icons';
import type { TimerMode } from '../types';

export const MODE_INFO: Record<
  TimerMode,
  {
    icon: typeof IconBrain;
    label: string;
    shortLabel: string;
    colorScheme: 'accent' | 'success';
  }
> = {
  work: {
    icon: IconBrain,
    label: 'Focus Time',
    shortLabel: 'Focus',
    colorScheme: 'accent',
  },
  shortBreak: {
    icon: IconCoffee,
    label: 'Short Break',
    shortLabel: 'Break',
    colorScheme: 'accent',
  },
  longBreak: {
    icon: IconBattery,
    label: 'Long Break',
    shortLabel: 'Long',
    colorScheme: 'success',
  },
};
