import React from 'react';
import { IconChevronDown } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';

export interface SelectItem {
  value: string;
  label: string;
}

export interface SelectGroup {
  label: string;
  items: SelectItem[];
}

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'onChange' | 'value'
> {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  /** Labelled option groups, rendered after `items`. */
  groups?: SelectGroup[];
  invalid?: boolean;
}

const renderOption = (item: SelectItem) => (
  <option key={item.value} value={item.value} className="bg-surface text-fg">
    {item.label}
  </option>
);

/**
 * Styled wrapper over a native <select> — full keyboard/screen-reader
 * accessibility for free, no Radix needed.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, value, onValueChange, items, groups, invalid, ...props },
    ref,
  ) => (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'h-9 w-full appearance-none rounded-md border bg-surface-2 pl-3 pr-9 text-base text-fg pointer-coarse:h-11 pointer-coarse:text-md',
          'transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2',
          invalid
            ? 'border-danger focus-visible:outline-danger'
            : 'border-line-strong focus-visible:outline-focus',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {items.map(renderOption)}
        {groups?.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map(renderOption)}
          </optgroup>
        ))}
      </select>
      <IconChevronDown
        size="sm"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  ),
);
Select.displayName = 'Select';
