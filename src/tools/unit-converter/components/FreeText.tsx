import React from 'react';
import { Input, Label, Stack, Text } from '@/shared/ui';

export interface FreeTextProps {
  value: string;
  onChange: (text: string) => void;
  /** "160.02 cm" when the text names a target unit; null when unreadable. */
  result: string | null;
  inputRef?: React.Ref<HTMLInputElement>;
}

/** "5 ft 3 in to cm" or "72F": jumps to the category with the value. */
export const FreeText: React.FC<FreeTextProps> = ({
  value,
  onChange,
  result,
  inputRef,
}) => (
  <Stack gap="1">
    <Label htmlFor="unit-free-text">Convert</Label>
    <Input
      id="unit-free-text"
      ref={inputRef}
      value={value}
      onChange={onChange}
      placeholder="5 ft 3 in to cm, 72F or 3 kg in lb"
      spellCheck={false}
      autoComplete="off"
      aria-describedby="unit-free-text-result"
    />
    <Text size="sm" tone="subtle" id="unit-free-text-result" aria-live="polite">
      {value.trim() === ''
        ? 'Type a quantity with its unit.'
        : result === null
          ? 'Not a quantity this converter knows.'
          : result}
    </Text>
  </Stack>
);
