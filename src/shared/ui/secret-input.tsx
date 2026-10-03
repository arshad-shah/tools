import React, { useState } from 'react';
import { IconButton } from './button';
import { IconEye, IconEyeOff } from './icons';
import { Input } from './input';

export interface SecretInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'trailingSlot' | 'clearable'
> {
  /** Names the value in the toggle, e.g. "key" gives "Reveal key". */
  label?: string;
}

/**
 * A field for a secret (an HMAC key, a token): masked as a password field
 * until revealed, never autofilled or spell-checked. The editable sibling
 * of SecretText.
 */
export const SecretInput = React.forwardRef<HTMLInputElement, SecretInputProps>(
  ({ label = 'secret', ...props }, ref) => {
    const [revealed, setRevealed] = useState(false);
    return (
      <Input
        ref={ref}
        autoComplete="off"
        spellCheck={false}
        {...props}
        type={revealed ? 'text' : 'password'}
        className="font-mono"
        trailingSlot={
          <IconButton
            size="sm"
            variant="ghost"
            label={`Reveal ${label}`}
            aria-pressed={revealed}
            icon={revealed ? IconEyeOff : IconEye}
            onClick={() => setRevealed(!revealed)}
            className="-mr-2"
          />
        }
      />
    );
  },
);
SecretInput.displayName = 'SecretInput';
