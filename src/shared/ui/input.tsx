import React from 'react';
import { IconX } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'size'
> {
  /** sm: a compact 24px field (inline editors in form rows); lg: a 44px touch target (Focus and phone). */
  size?: 'sm' | 'md' | 'lg';
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
      size = 'md',
      ...props
    },
    ref,
  ) => {
    const showClear = clearable && !!value && !!onChange;
    return (
      <div
        data-field-box=""
        // The whole box is the target: a press on its padding focuses the field.
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          e.currentTarget.querySelector('input')?.focus();
        }}
        className={cn(
          // min-w-0: shrinks inside flex rows; touch: 44px tall, 16px text (no
          // focus zoom on iOS), except the compact sm size of inline editors.
          'flex w-full min-w-0 cursor-text items-center rounded-md border bg-surface-2 transition-colors duration-fast',
          size === 'sm'
            ? 'h-6 gap-1 px-1.5'
            : size === 'lg'
              ? 'h-touch gap-2 px-3'
              : 'h-9 gap-2 px-3 pointer-coarse:h-touch',
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
            'min-w-0 flex-1 self-stretch bg-transparent text-fg',
            size === 'sm' ? 'text-xs' : 'text-sm pointer-coarse:text-md',
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
            className="-mr-2 inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:text-fg pointer-coarse:size-11"
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
