import React from 'react';
import { IconX } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';

interface TextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'value'
> {
  value: string;
  onChange?: (value: string) => void;
  /** Show a clear (close icon) affordance when there is content. */
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
          'w-full resize-y rounded-md border bg-surface-2 px-3 py-2 font-mono text-sm text-fg pointer-coarse:text-md',
          'placeholder:text-fg-subtle',
          'transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2',
          invalid
            ? 'border-danger focus-visible:outline-danger'
            : 'border-line-strong focus-visible:outline-focus',
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
          className="absolute right-2 top-2 text-fg-subtle transition-colors hover:text-fg"
        >
          <IconX size="sm" />
        </button>
      )}
    </div>
  ),
);
Textarea.displayName = 'Textarea';
