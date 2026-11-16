import { battery, brain, coffee } from '@arshad-shah/cynosure/icons';
import type { IconData } from '@arshad-shah/cynosure/icons';
import type { TimerMode } from '../types';

export const MODE_INFO: Record<
  TimerMode,
  {
    icon: IconData;
    label: string;
    shortLabel: string;
    colorScheme: 'accent' | 'success';
  }
> = {
  work: {
    icon: brain,
    label: 'Focus Time',
    shortLabel: 'Focus',
    colorScheme: 'accent',
  },
  shortBreak: {
    icon: coffee,
    label: 'Short Break',
    shortLabel: 'Break',
    colorScheme: 'accent',
  },
  longBreak: {
    icon: battery,
    label: 'Long Break',
    shortLabel: 'Long',
    colorScheme: 'success',
  },
};
