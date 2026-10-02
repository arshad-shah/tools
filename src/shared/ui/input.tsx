import React from 'react';
import { IconX } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value: string;
  onChange?: (value: string) => void;
  invalid?: boolean;
  clearable?: boolean;
  leadingSlot?: React.ReactNode;
  trailingSlot?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      value,
      onChange,
      invalid,
      clearable,
      leadingSlot,
      trailingSlot,
      ...props
    },
    ref,
  ) => {
    const showClear = clearable && !!value && !!onChange;
    return (
      <div
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border bg-surface-2 px-3 transition-colors duration-fast',
          invalid
            ? 'border-danger focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-danger'
            : 'border-line-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
        )}
      >
        {leadingSlot && (
          <span className="shrink-0 text-fg-subtle" aria-hidden>
            {leadingSlot}
          </span>
        )}
        <input
          ref={ref}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-sm text-fg',
            'placeholder:text-fg-subtle focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => onChange('')}
            className="shrink-0 text-fg-subtle transition-colors hover:text-fg"
          >
            <IconX size="sm" />
          </button>
        )}
        {trailingSlot && <span className="shrink-0">{trailingSlot}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';
