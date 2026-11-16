import { Stack, Text, TextField } from '@arshad-shah/cynosure';
import { search } from '@arshad-shah/cynosure/icons';
import React from 'react';

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
  <Stack gap="3">
    <TextField
      ref={inputRef}
      label="Convert"
      labelHidden
      size="lg"
      iconStart={search}
      clearable
      value={value}
      onChange={onChange}
      placeholder="5 ft 3 in to cm, 72F or 3 kg in lb"
      spellCheck={false}
      autoComplete="off"
    />
    <Text
      size={result && value.trim() ? 'lg' : 'sm'}
      weight={result && value.trim() ? 'medium' : 'regular'}
      tone={result && value.trim() ? 'neutral' : 'muted'}
    >
      {value.trim() === ''
        ? 'Type a quantity with its unit.'
        : result === null
          ? 'Not a quantity this converter knows.'
          : result}
    </Text>
  </Stack>
);
