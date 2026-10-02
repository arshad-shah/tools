import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheckCircle,
  IconCpu,
  IconInfo,
  type IconComponent,
} from '@/shared/ui/icons';

import type { LogLevel } from '../types';

/** Label, badge tone and icon component per level (rendered at size 14). */
export const LEVEL_INFO: Record<
  LogLevel,
  {
    label: string;
    tone: 'danger' | 'warning' | 'accent' | 'neutral' | 'success';
    icon: IconComponent;
  }
> = {
  error: {
    label: 'Error',
    tone: 'danger',
    icon: IconAlertCircle,
  },
  warn: {
    label: 'Warn',
    tone: 'warning',
    icon: IconAlertTriangle,
  },
  info: {
    label: 'Info',
    tone: 'accent',
    icon: IconInfo,
  },
  debug: {
    label: 'Debug',
    tone: 'neutral',
    icon: IconCpu,
  },
  success: {
    label: 'Success',
    tone: 'success',
    icon: IconCheckCircle,
  },
};
