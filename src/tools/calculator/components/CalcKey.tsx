import React from 'react';
import { Button } from '@/shared/ui';

type KeyColorScheme = 'accent' | 'neutral' | 'danger' | 'success' | 'warning';
type KeyVariant = 'primary' | 'secondary' | 'ghost';

interface CalcKeyProps {
  onClick?: () => void;
  variant?: KeyVariant;
  colorScheme?: KeyColorScheme;
  icon?: React.ReactNode;
  /** Accessible name; required in practice for icon-only keys. */
  label?: string;
  children?: React.ReactNode;
}

export const CalcKey: React.FC<CalcKeyProps> = ({
  onClick,
  variant = 'secondary',
  colorScheme = 'neutral',
  icon,
  label,
  children,
}) => (
  <Button
    variant={colorScheme === 'danger' ? 'danger' : variant}
    size="lg"
    leftIcon={icon}
    aria-label={label}
    onClick={onClick}
    fullWidth
  >
    {children}
  </Button>
);
