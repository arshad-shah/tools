import React from 'react';
import { Button } from '@/shared/ui';

type KeyColorScheme = 'accent' | 'neutral' | 'danger' | 'success' | 'warning';
type KeyVariant = 'solid' | 'soft' | 'outline' | 'ghost';

interface CalcKeyProps {
  onClick?: () => void;
  variant?: KeyVariant;
  colorScheme?: KeyColorScheme;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const CalcKey: React.FC<CalcKeyProps> = ({
  onClick,
  variant = 'soft',
  colorScheme = 'neutral',
  icon,
  children,
}) => (
  <Button
    variant={colorScheme === 'danger' ? 'danger' : variant}
    size="lg"
    leftIcon={icon}
    onClick={onClick}
    fullWidth
  >
    {children}
  </Button>
);
