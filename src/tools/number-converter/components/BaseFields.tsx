import React from 'react';
import { IconCheck, IconCopy } from '@/shared/ui/icons';
import {
  Grid,
  IconButton,
  Input,
  Label,
  NumberInput,
  Stack,
  Text,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import type { FieldKey } from '../lib/state';

export interface BaseField {
  key: FieldKey;
  label: string;
  /** Shown under the label, e.g. "Base 16, accepts 0x". */
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

const CopyButton: React.FC<{
  label: string;
  value: string;
  copied: boolean;
  onCopy(): void;
}> = ({ label, value, copied, onCopy }) => (
  <IconButton
    variant="ghost"
    size="sm"
    label={copied ? `Copied ${label}` : `Copy ${label}`}
    icon={copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />}
    disabled={!value}
    onClick={onCopy}
  />
);

/**
 * The editable base fields (spec §8.5): typing in any of them updates the
 * rest; an error shows under the edited field while the others clear.
 */
export const BaseFields: React.FC<BaseFieldsProps> = ({
  fields,
  error,
  onEdit,
  customBase,
  onCustomBase,
  base32,
  base58,
}) => {
  const { copiedKey, copy } = useClipboard();
  return (
    <Stack gap="4">
      <Grid max={2} gap="4">
        {fields.map((f) => {
          const id = `number-field-${f.key}`;
          const err = error?.key === f.key ? error.message : null;
          return (
            <Stack gap="1" key={f.key}>
              <Label htmlFor={id}>{f.label}</Label>
              <Input
                id={id}
                value={f.value}
                onChange={(text) => onEdit(f.key, text)}
                invalid={!!err}
                aria-invalid={!!err || undefined}
                aria-describedby={err ? `${id}-error` : `${id}-hint`}
                spellCheck={false}
                autoComplete="off"
                // Digit-only bases get the number pad on phones.
                inputMode={
                  f.key === 'bin' || f.key === 'oct' ? 'numeric' : 'text'
                }
                className="font-mono"
                placeholder="None"
                trailingSlot={
                  <CopyButton
                    label={f.label}
                    value={f.value}
                    copied={copiedKey === f.key}
                    onCopy={() => void copy(f.value, f.key)}
                  />
                }
              />
              {err ? (
                <Text id={`${id}-error`} size="sm" className="text-danger">
                  {err}
                </Text>
              ) : (
                <Text id={`${id}-hint`} size="xs" tone="subtle">
                  {f.hint}
                  {f.repeating ? '. The fraction repeats forever' : ''}
                </Text>
              )}
            </Stack>
          );
        })}
      </Grid>
      <Stack gap="1">
        <Label htmlFor="number-custom-base">Custom base (2 to 36)</Label>
        <NumberInput
          id="number-custom-base"
          value={customBase}
          min={2}
          max={36}
          onValueChange={(b) =>
            onCustomBase(Math.min(36, Math.max(2, Math.round(b))))
          }
          className="w-32"
        />
      </Stack>
      <Grid max={2} gap="4">
        {(
          [
            ['base32', 'Base32 (bytes, RFC 4648)', base32],
            ['base58', 'Base58 (bytes, Bitcoin alphabet)', base58],
          ] as const
        ).map(([key, label, value]) => (
          <Stack gap="1" key={key}>
            <Label htmlFor={`number-${key}`}>{label}</Label>
            <Input
              id={`number-${key}`}
              value={value}
              readOnly
              placeholder="None"
              className="font-mono"
              trailingSlot={
                <CopyButton
                  label={label}
                  value={value}
                  copied={copiedKey === key}
                  onCopy={() => void copy(value, key)}
                />
              }
            />
          </Stack>
        ))}
      </Grid>
    </Stack>
  );
};
