import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'size' | 'prefix'
> {
  value: string;
  onChange: (value: string) => void;
  /** Monospace prompt glyph shown before the field. */
  prompt?: string;
  size?: 'md' | 'lg';
}

/**
 * Command-line styled search field: a mono prompt, the query, and a
 * blinking caret when empty. Used for the dashboard "grep" bar and in tools.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onChange,
      prompt = '$',
      size = 'md',
      placeholder,
      ...props
    },
    ref,
  ) => (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-line bg-surface transition-colors focus-within:border-accent',
        size === 'lg' ? 'h-12 px-4' : 'h-10 px-3',
        className,
      )}
    >
      <span aria-hidden className="select-none font-mono font-bold text-accent">
        {prompt}
      </span>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'min-w-0 flex-1 bg-transparent font-mono text-fg caret-accent',
          'placeholder:text-fg-faint focus:outline-none',
          size === 'lg' ? 'text-base' : 'text-sm',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="shrink-0 text-fg-faint transition-colors hover:text-fg"
        >
          <X size={size === 'lg' ? 18 : 16} />
        </button>
      ) : (
        <span
          aria-hidden
          className="h-4 w-2 shrink-0 animate-caret bg-accent"
        />
      )}
    </div>
  ),
);
SearchInput.displayName = 'SearchInput';
