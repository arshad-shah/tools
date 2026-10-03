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
  'onChange' | 'value' | 'size'
> {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  /** sm: 32px (toolbars). Default md (36px). Touch is 44px either way. */
  size?: 'sm' | 'md';
  /** Labelled option groups, rendered after `items`. */
  groups?: SelectGroup[];
  invalid?: boolean;
}

const renderOption = (item: SelectItem) => (
  <option key={item.value} value={item.value} className="bg-surface text-fg">
    {item.label}
  </option>
);

/** Sizing classes (width, flex) that belong on the wrapper, not the select. */
const LAYOUT = /^(?:(?:min-|max-)?w-|basis-|grow|shrink|flex-|self-|col-span-)/;
const splitLayout = (className?: string) => {
  const outer: string[] = [];
  const inner: string[] = [];
  for (const c of className?.split(/\s+/) ?? []) {
    if (!c) continue;
    (LAYOUT.test(c.slice(c.lastIndexOf(':') + 1)) ? outer : inner).push(c);
  }
  return { outer: outer.join(' '), inner: inner.join(' ') };
};

/**
 * Styled wrapper over a native <select> — full keyboard/screen-reader
 * accessibility for free, no Radix needed.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      value,
      onValueChange,
      items,
      groups,
      invalid,
      size = 'md',
      ...props
    },
    ref,
  ) => {
    // Width classes size the wrapper, so the chevron stays inside the box.
    const { outer, inner } = splitLayout(className);
    return (
      <div className={cn('relative', outer)}>
        <select
          ref={ref}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(
            'w-full appearance-none rounded-md border bg-surface-2 pl-3 pr-9 text-fg pointer-coarse:h-11 pointer-coarse:text-md',
            size === 'sm' ? 'h-8 text-sm' : 'h-9 text-base',
            'transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2',
            invalid
              ? 'border-danger focus-visible:outline-danger'
              : 'border-line-strong focus-visible:outline-focus',
            'disabled:cursor-not-allowed disabled:opacity-50',
            inner,
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
    );
  },
);
Select.displayName = 'Select';
