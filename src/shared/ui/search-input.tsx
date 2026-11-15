import React from 'react';
import { SearchField } from '@arshad-shah/cynosure';
import { MONO_FIELD, fieldClass, useFieldElement } from './field-props';

interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | 'onChange'
  | 'value'
  | 'size'
  | 'prefix'
  | 'type'
  | 'defaultValue'
  | 'children'
  | 'width'
  | 'onSubmit'
> {
  value: string;
  onChange: (value: string) => void;
  size?: 'md' | 'lg';
}

/**
 * The search field (dashboard "grep" bar and in tools) over Cynosure's
 * SearchField: search icon, a clear button, Escape clears then blurs. The
 * query keeps the monospace type. Named by `aria-label` or a separate label.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      style,
      value,
      onChange,
      size = 'md',
      'aria-describedby': describedBy,
      ...props
    },
    ref,
  ) => {
    const inputRef = useFieldElement(ref, describedBy);
    const { layout } = fieldClass(className);
    return (
      <SearchField
        ref={inputRef}
        {...props}
        label={props['aria-label'] ?? ''}
        labelHidden
        value={value}
        onChange={onChange}
        size={size}
        labels={{ clear: 'Clear search' }}
        className={layout}
        style={{ ...MONO_FIELD, ...style }}
      />
    );
  },
);
SearchInput.displayName = 'SearchInput';
