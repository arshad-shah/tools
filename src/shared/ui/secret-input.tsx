import React from 'react';
import { TextField } from '@arshad-shah/cynosure';
import { MONO_FIELD, fieldClass, useFieldElement } from './field-props';

export interface SecretInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'size' | 'type' | 'defaultValue' | 'children' | 'width'
> {
  value: string;
  onChange?: (value: string) => void;
  invalid?: boolean;
  /** Names the value in the toggle, e.g. "key" gives "Reveal key". */
  label?: string;
}

/**
 * A field for a secret (an HMAC key, a token): Cynosure's revealable
 * password field, masked until revealed, never autofilled or spell-checked.
 * The editable sibling of SecretText.
 */
export const SecretInput = React.forwardRef<HTMLInputElement, SecretInputProps>(
  (
    {
      label = 'secret',
      className,
      style,
      value,
      onChange,
      invalid,
      'aria-describedby': describedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const inputRef = useFieldElement(ref, describedBy);
    const { layout } = fieldClass(className);
    const toggle = `Reveal ${label}`;
    return (
      <TextField
        ref={inputRef}
        autoComplete="off"
        spellCheck={false}
        {...props}
        label={props['aria-label'] ?? ''}
        labelHidden
        type="password"
        revealable
        // One name in both states; aria-pressed carries the state.
        labels={{ show: toggle, hide: toggle }}
        value={value}
        onChange={onChange}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        className={layout}
        style={{ ...MONO_FIELD, ...style }}
      />
    );
  },
);
SecretInput.displayName = 'SecretInput';
