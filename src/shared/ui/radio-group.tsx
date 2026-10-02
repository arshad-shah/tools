import React, { useId } from 'react';
import { cn } from '@/shared/lib/cn';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  value: string;
  onValueChange(value: string): void;
  options: RadioOption[];
  /** Names the group; or pass a visible heading's id via labelledBy. */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  /** Above the options, inside the group (e.g. a visible heading). */
  heading?: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/** Native radio buttons in the kit's style: arrow keys move, Space picks. */
export function RadioGroup({
  value,
  onValueChange,
  options,
  label,
  labelledBy,
  disabled,
  heading,
  orientation = 'horizontal',
  className,
}: RadioGroupProps) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={cn('flex flex-col gap-2', className)}
    >
      {heading}
      <div
        className={cn(
          'flex gap-x-4 gap-y-2',
          orientation === 'horizontal' ? 'flex-wrap' : 'flex-col',
        )}
      >
        {options.map((o, i) => (
          <label
            key={i}
            className="flex items-center gap-2 text-sm text-fg has-[:disabled]:opacity-50"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={disabled}
              onChange={() => onValueChange(o.value)}
              className="size-4 accent-accent-indicator focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
RadioGroup.displayName = 'RadioGroup';
