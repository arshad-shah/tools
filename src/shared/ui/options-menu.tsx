import React, { useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Badge } from './badge';
import { Button } from './button';
import { IconChevronDown, IconSettings2 } from './icons';
import { Popover } from './popover';
import { Text } from './typography';

export interface OptionsMenuProps {
  /** Button text and the popover's accessible name. */
  label?: string;
  /** Short title shown at the top of the panel (default `label`). */
  title?: string;
  /** How many options differ from their defaults; shown on the button. */
  changed?: number;
  size?: 'sm' | 'md';
  align?: 'start' | 'end';
  disabled?: boolean;
  /** Panel width class (default w-80). */
  width?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Secondary settings behind one button (formatting rules, toggles that are
 * set once and left). Keeps the main control row short; a count on the
 * button says when something differs from the defaults.
 */
export function OptionsMenu({
  label = 'Options',
  title,
  changed,
  size = 'sm',
  align = 'end',
  disabled,
  width = 'w-80',
  className,
  children,
}: OptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        ref={anchor}
        type="button"
        size={size}
        variant="secondary"
        disabled={disabled}
        leftIcon={<IconSettings2 size="sm" />}
        rightIcon={<IconChevronDown size="sm" />}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={className}
      >
        {label}
        {changed ? (
          <Badge size="xs" tone="accent">
            {changed}
          </Badge>
        ) : null}
      </Button>
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={anchor}
        align={align}
        label={label}
        className={cn('max-w-[calc(100vw-2rem)]', width)}
      >
        <div className="flex flex-col gap-3 p-1">
          <Text
            as="span"
            size="xs"
            tone="subtle"
            className="font-mono uppercase tracking-wide"
          >
            {title ?? label}
          </Text>
          {children}
        </div>
      </Popover>
    </>
  );
}
OptionsMenu.displayName = 'OptionsMenu';
