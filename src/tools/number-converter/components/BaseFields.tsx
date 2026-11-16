import {
  CopyButton,
  Grid,
  NumberField,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import React from 'react';
import type { FieldKey } from '../lib/state';

export interface BaseField {
  key: FieldKey;
  label: string;
  /** Shown under the field, e.g. "Base 16, accepts 0x". */
  hint: string;
  value: string;
  /** The fraction repeats forever (cut at the precision setting). */
  repeating?: boolean;
}

interface BaseFieldsProps {
  fields: BaseField[];
  /** The field being edited and its parse error, if any. */
  error: { key: FieldKey; message: string } | null;
  onEdit(key: FieldKey, text: string): void;
  customBase: number;
  onCustomBase(base: number): void;
  base32: string;
  base58: string;
}

/**
 * The editable base fields: typing in any of them updates the rest; an
 * error shows under the edited field while the others clear.
 */
export const BaseFields: React.FC<BaseFieldsProps> = ({
  fields,
  error,
  onEdit,
  customBase,
  onCustomBase,
  base32,
  base58,
}) => (
  <Stack gap="5">
    <Grid minItemWidth="16rem" gap="4">
      {fields.map((f) => (
        <TextField
          key={f.key}
          label={f.label}
          description={`${f.hint}${f.repeating ? '. The fraction repeats forever' : ''}`}
          error={error?.key === f.key ? error.message : undefined}
          value={f.value}
          onChange={(text) => onEdit(f.key, text)}
          spellCheck={false}
          autoComplete="off"
          // Digit-only bases get the number pad on phones.
          inputMode={f.key === 'bin' || f.key === 'oct' ? 'numeric' : 'text'}
          placeholder="None"
          addonEnd={
            <CopyButton
              size="sm"
              value={f.value}
              disabled={!f.value}
              labels={{ copy: `Copy ${f.label}` }}
            />
          }
        />
      ))}
    </Grid>
    <NumberField
      label="Custom base (2 to 36)"
      width="sm"
      value={customBase}
      min={2}
      max={36}
      onChange={(b) =>
        b !== null && onCustomBase(Math.min(36, Math.max(2, Math.round(b))))
      }
    />
    <Grid minItemWidth="16rem" gap="4">
      {(
        [
          ['Base32 (bytes, RFC 4648)', base32],
          ['Base58 (bytes, Bitcoin alphabet)', base58],
        ] as const
      ).map(([label, value]) => (
        <TextField
          key={label}
          label={label}
          value={value}
          readOnly
          placeholder="None"
          addonEnd={
            <CopyButton
              size="sm"
              value={value}
              disabled={!value}
              labels={{ copy: `Copy ${label}` }}
            />
          }
        />
      ))}
    </Grid>
  </Stack>
);
