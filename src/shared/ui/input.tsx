import React from 'react';
import { TextField, type TextFieldProps } from '@arshad-shah/cynosure';
import {
  INVALID_FIELD,
  MONO_FIELD,
  fieldClass,
  useFieldElement,
} from './field-props';

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'size' | 'defaultValue' | 'children' | 'width'
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

const SIZE = { sm: 'xs', md: 'md', lg: 'lg' } as const;

/**
 * A single-line field over Cynosure's TextField. Call sites name it with a
 * separate `<Label htmlFor={id}>` or `aria-label`, so the TextField's own
 * label stays hidden (and empty unless `aria-label` gives it the text).
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      style,
      value,
      onChange,
      invalid,
      clearable,
      leadingSlot,
      trailingSlot,
      size = 'md',
      type,
      'aria-describedby': describedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const inputRef = useFieldElement(ref, describedBy);
    const { mono, layout } = fieldClass(className);
    return (
      <TextField
        ref={inputRef}
        {...props}
        label={props['aria-label'] ?? ''}
        labelHidden
        // date, time and datetime-local are native input types TextField passes on.
        type={type as TextFieldProps['type']}
        value={value}
        onChange={onChange}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        size={SIZE[size]}
        clearable={clearable && !!onChange}
        addonStart={
          leadingSlot ? (
            <span aria-hidden className="inline-flex shrink-0">
              {leadingSlot}
            </span>
          ) : undefined
        }
        addonEnd={trailingSlot}
        className={layout}
        style={{
          ...(mono ? MONO_FIELD : null),
          ...(invalid ? INVALID_FIELD : null),
          ...style,
        }}
      />
    );
  },
);
Input.displayName = 'Input';
