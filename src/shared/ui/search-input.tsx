import React from 'react';
import { IconX } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';

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
        'flex items-center gap-2 rounded-md border border-line-strong bg-surface-2 transition-colors duration-fast focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
        size === 'lg' ? 'h-touch px-4' : 'h-9 px-3 pointer-coarse:h-touch',
        className,
      )}
    >
      <span
        aria-hidden
        className="select-none font-mono font-bold text-accent-fg"
      >
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
          'placeholder:text-fg-subtle focus:outline-none',
          size === 'lg' ? 'text-base' : 'text-sm',
          'self-stretch pointer-coarse:text-md',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="shrink-0 text-fg-subtle transition-colors hover:text-fg"
        >
          <IconX size={size === 'lg' ? 'md' : 'sm'} />
        </button>
      ) : (
        <span
          aria-hidden
          className="h-4 w-2 shrink-0 motion-safe:animate-caret bg-accent"
        />
      )}
    </div>
  ),
);
SearchInput.displayName = 'SearchInput';
