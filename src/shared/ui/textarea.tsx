import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'value'
> {
  value: string;
  onChange?: (value: string) => void;
  /** Show a clear (✕) affordance when there is content. */
  clearable?: boolean;
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, value, onChange, clearable, invalid, readOnly, ...props },
    ref,
  ) => (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cn(
          'w-full resize-y rounded-md border bg-surface px-3 py-2 font-mono text-sm text-fg',
          'placeholder:text-fg-faint',
          'transition-colors focus:outline-none',
          invalid
            ? 'border-danger focus:border-danger'
            : 'border-line focus:border-accent',
          readOnly && 'text-fg-muted',
          clearable && value ? 'pr-9' : '',
          className,
        )}
        {...props}
      />
      {clearable && value && onChange && (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onChange('')}
          className="absolute right-2 top-2 text-fg-faint transition-colors hover:text-fg"
        >
          <X size={16} />
        </button>
      )}
    </div>
  ),
);
Textarea.displayName = 'Textarea';
