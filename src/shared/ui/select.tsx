import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectItem {
  value: string;
  label: string;
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'onChange' | 'value'
> {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  invalid?: boolean;
}

/**
 * Styled wrapper over a native <select> — full keyboard/screen-reader
 * accessibility for free, no Radix needed.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, value, onValueChange, items, invalid, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'h-10 w-full appearance-none rounded-md border bg-surface pl-3 pr-9 text-sm text-fg',
          'transition-colors focus:outline-none',
          invalid
            ? 'border-danger focus:border-danger'
            : 'border-line focus:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {items.map((item) => (
          <option
            key={item.value}
            value={item.value}
            className="bg-surface text-fg"
          >
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  ),
);
Select.displayName = 'Select';
